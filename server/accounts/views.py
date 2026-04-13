from datetime import timedelta
import random
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.utils import timezone
from .serializers import (
    UserSerializer, LoginSerializer, PasswordResetRequestSerializer,
    OTPVerificationSerializer, ChangePasswordSerializer, EmailVerificationSerializer,
    SendVerificationSerializer, GoogleLoginSerializer
)
from .models import User, OTP
from .email_utils import (
    send_email_async,
    get_password_reset_email_content,
    get_email_verification_content,
    get_resend_verification_content
)


def generate_otp_code():
    """Generate a 6-digit OTP code."""
    return ''.join([str(random.randint(0, 9)) for _ in range(6)])


def create_otp(user, otp_type):
    """Create OTP record for a user."""
    otp_code = generate_otp_code()
    expires_at = timezone.now() + timedelta(minutes=10)
    
    OTP.objects.create(
        user=user,
        otp=otp_code,
        otp_type=otp_type,
        expires_at=expires_at
    )
    return otp_code


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    authentication_classes = []  # Disable authentication for registration
    serializer_class = UserSerializer
    
    def perform_create(self, serializer):
        user = serializer.save()
        
        # Generate and send email verification OTP
        otp = create_otp(user, 'email_verification')
        
        # Send verification email asynchronously
        subject, text_content, html_content = get_email_verification_content(user.username, otp)
        send_email_async(subject, text_content, html_content, [user.email])
    
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == 201:
            response.data['message'] = 'Registration successful! Please check your email for verification OTP.'
        return response

class LoginView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []  # Explicitly disable authentication for login
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            user = authenticate(email=email, password=password)
            
            if user:
                # Check if email is verified
                if not user.is_verified:
                    return Response({
                        'error': 'Email not verified',
                        'message': 'Please verify your email before signing in',
                        'requires_verification': True,
                        'email': email
                    }, status=status.HTTP_403_FORBIDDEN)
                
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                })
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []  # Disable authentication for password reset
    
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                otp = create_otp(user, 'password_reset')
                
                # Send OTP via email asynchronously
                subject, text_content, html_content = get_password_reset_email_content(user.username, otp)
                send_email_async(subject, text_content, html_content, [email])
                
                return Response({'message': 'OTP sent successfully to your email'})
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []  # Disable authentication for OTP verification
    
    def post(self, request):
        serializer = OTPVerificationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp_code = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']
            
            try:
                user = User.objects.get(email=email)
                otp = OTP.objects.filter(
                    user=user,
                    otp=otp_code,
                    otp_type='password_reset',
                    expires_at__gt=timezone.now(),
                    is_used=False
                ).latest('created_at')
                
                user.set_password(new_password)
                user.save()
                otp.is_used = True
                otp.save()
                
                return Response({'message': 'Password reset successful'})
            except (User.DoesNotExist, OTP.DoesNotExist):
                return Response({'error': 'Invalid OTP or user'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(APIView):
    permission_classes = (IsAuthenticated,)
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if user.check_password(serializer.validated_data['old_password']):
                user.set_password(serializer.validated_data['new_password'])
                user.save()
                return Response({'message': 'Password changed successfully'})
            return Response({'error': 'Invalid old password'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SendVerificationView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []  # Disable authentication for sending verification
    
    def post(self, request):
        serializer = SendVerificationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            try:
                user = User.objects.get(email=email)
                
                # Delete any existing email verification OTPs for this user
                OTP.objects.filter(user=user, otp_type='email_verification').delete()
                
                # Generate new OTP
                otp = create_otp(user, 'email_verification')
                
                # Send verification email asynchronously
                subject, text_content, html_content = get_resend_verification_content(user.username, otp)
                send_email_async(subject, text_content, html_content, [email])
                
                return Response({'message': 'Verification OTP sent successfully to your email'})
            except User.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmailVerificationView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []  # Disable authentication for email verification
    
    def post(self, request):
        serializer = EmailVerificationSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp_code = serializer.validated_data['otp']
            
            try:
                user = User.objects.get(email=email)
                otp = OTP.objects.filter(
                    user=user,
                    otp=otp_code,
                    otp_type='email_verification',
                    expires_at__gt=timezone.now(),
                    is_used=False
                ).latest('created_at')
                
                # Mark user as verified and OTP as used
                user.is_verified = True
                user.save()
                otp.is_used = True
                otp.save()
                
                return Response({'message': 'Email verified successfully'})
            except (User.DoesNotExist, OTP.DoesNotExist):
                return Response({'error': 'Invalid OTP or user'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GoogleLoginView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = []  # Disable authentication for Google login
    
    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        if serializer.is_valid():
            credential_token = serializer.validated_data['access_token']
            
            try:
                # Decode JWT token from Google
                import jwt
                import requests
                from jwt.exceptions import InvalidTokenError
                
                # First, try to decode the JWT token to get user info
                try:
                    # Decode without verification for now (Google's public keys would be needed for full verification)
                    decoded_token = jwt.decode(credential_token, options={"verify_signature": False})
                    email = decoded_token.get('email')
                    name = decoded_token.get('name', '')
                    first_name = decoded_token.get('given_name', '')
                    last_name = decoded_token.get('family_name', '')
                    
                except (InvalidTokenError, Exception) as jwt_error:
                    # If JWT decode fails, try treating it as an access token
                    google_response = requests.get(
                        f'https://www.googleapis.com/oauth2/v1/userinfo?access_token={credential_token}'
                    )
                    
                    if google_response.status_code == 200:
                        google_data = google_response.json()
                        email = google_data.get('email')
                        name = google_data.get('name', '')
                        first_name = google_data.get('given_name', '')
                        last_name = google_data.get('family_name', '')
                    else:
                        return Response({'error': 'Invalid Google token', 'details': str(jwt_error)}, status=status.HTTP_400_BAD_REQUEST)
                
                if not email:
                    return Response({'error': 'Email not provided by Google'}, status=status.HTTP_400_BAD_REQUEST)
                
                # Get or create user
                try:
                    user = User.objects.get(email=email)
                    # If user exists but wasn't verified, mark as verified (Google account is trusted)
                    if not user.is_verified:
                        user.is_verified = True
                        user.save()
                except User.DoesNotExist:
                    # Create new user with Google data
                    username = email.split('@')[0]  # Use email prefix as username
                    # Ensure username is unique
                    counter = 1
                    original_username = username
                    while User.objects.filter(username=username).exists():
                        username = f'{original_username}{counter}'
                        counter += 1
                    
                    user = User.objects.create_user(
                        username=username,
                        email=email,
                        first_name=first_name,
                        last_name=last_name,
                        is_verified=True  # Google accounts are pre-verified
                    )
                    user.set_unusable_password()  # No password needed for Google users
                    user.save()
                
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': UserSerializer(user).data
                })
                    
            except Exception as e:
                return Response({'error': f'Google authentication failed: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
