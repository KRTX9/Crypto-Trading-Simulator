"""
Email utility functions for sending emails asynchronously
"""
import threading
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from datetime import datetime


def send_email_async(subject, text_content, html_content, recipient_list):
    """
    Send email asynchronously in a separate thread to avoid blocking the request
    
    Args:
        subject (str): Email subject
        text_content (str): Plain text email content
        html_content (str): HTML email content
        recipient_list (list): List of recipient email addresses
    """
    def send_email():
        try:
            email_msg = EmailMultiAlternatives(
                subject,
                text_content,
                settings.DEFAULT_FROM_EMAIL,
                recipient_list,
            )
            email_msg.attach_alternative(html_content, "text/html")
            email_msg.send(fail_silently=False)
        except Exception as e:
            print(f"❌ Failed to send email: {str(e)}")
    
    # Start email sending in a separate thread
    email_thread = threading.Thread(target=send_email)
    email_thread.daemon = True
    email_thread.start()


def get_password_reset_email_content(username, otp):
    """
    Generate password reset email content
    
    Args:
        username (str): User's username
        otp (str): One-time password
    
    Returns:
        tuple: (subject, text_content, html_content)
    """
    subject = '🔐 KRTX9 Security Alert - Password Reset'
    text_content = f'Your trading terminal password reset OTP is: {otp}. Valid for 10 minutes.'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Courier New', Consolas, monospace; background: #0a0a0f; color: #4ade80; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #1a1a2e; border: 1px solid #ec4899; border-radius: 12px; padding: 30px;">
          
          <!-- Security Alert Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: rgba(236, 72, 153, 0.1); border: 1px solid #ec4899; border-radius: 8px; padding: 15px;">
              <h1 style="color: #ec4899; margin: 0; font-size: 22px; letter-spacing: 2px;">🔐 SECURITY PROTOCOL</h1>
              <div style="color: #f472b6; font-size: 12px; margin-top: 5px;">PASSWORD RESET REQUEST</div>
            </div>
          </div>

          <!-- Alert Message -->
          <div style="background: rgba(236, 72, 153, 0.1); border: 2px solid #ec4899; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center;">
            <div style="color: #ec4899; font-size: 14px; margin-bottom: 8px;">⚠️ SECURITY ALERT ⚠️</div>
            <div style="color: #f472b6; line-height: 1.6;">
              A password reset was requested for your KRTX9 account.<br>
              If this wasn't you, secure your account immediately.
            </div>
          </div>

          <!-- OTP Section -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="color: #f472b6; font-size: 13px; margin-bottom: 12px;">RESET AUTHORIZATION CODE:</div>
            <div style="background: #0a0a0f; border: 2px solid #ec4899; border-radius: 12px; padding: 15px; display: inline-block;">
              <div style="color: #ec4899; font-size: 32px; font-weight: bold; letter-spacing: 6px;">
                {otp}
              </div>
            </div>
            <div style="color: #f472b6; font-size: 11px; margin-top: 12px;">
              ⏱️ EXPIRES IN 10 MINUTES | SINGLE USE ONLY
            </div>
          </div>

          <!-- Security Instructions -->
          <div style="background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
            <div style="color: #fbbf24; font-size: 12px; margin-bottom: 8px;">🛡️ SECURITY CHECKLIST:</div>
            <div style="color: #fef3c7; font-size: 11px; line-height: 1.5;">
              • Use this code only on the official K9TX platform<br>
              • Never share this code with support or anyone else<br>
              • Choose a strong, unique password for your account<br>
              • Enable 2FA for additional security
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid rgba(236, 72, 153, 0.3); margin-top: 30px; padding-top: 15px; text-align: center;">
            <div style="color: #ec4899; font-size: 11px; margin-bottom: 8px;">K9TX SECURITY</div>
            <div style="color: #f472b6; font-size: 9px;">
              Your security is our priority. Trade with confidence.<br>
              © {datetime.now().year} K9TX Capital Management. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
    """
    
    return subject, text_content, html_content


def get_email_verification_content(username, otp):
    """
    Generate email verification content
    
    Args:
        username (str): User's username
        otp (str): One-time password
    
    Returns:
        tuple: (subject, text_content, html_content)
    """
    subject = '🚀 Welcome to K9TX Terminal - Verify Your Access'
    text_content = f'Welcome {username}! Your trading terminal access OTP is: {otp}. Valid for 10 minutes.'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Courier New', Consolas, monospace; background: #0a0a0f; color: #4ade80; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #1a1a2e; border: 1px solid #4ade80; border-radius: 12px; padding: 30px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: rgba(74, 222, 128, 0.1); border: 1px solid #4ade80; border-radius: 8px; padding: 15px;">
              <h1 style="color: #4ade80; margin: 0; font-size: 22px; letter-spacing: 2px;">⚡ K9TX TERMINAL ⚡</h1>
              <div style="color: #86efac; font-size: 12px; margin-top: 5px;">SECURE TRADING PLATFORM</div>
            </div>
          </div>

          <!-- Welcome Message -->
          <div style="background: rgba(0, 0, 0, 0.3); border-left: 3px solid #4ade80; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
            <div style="color: #22c55e; font-size: 13px; margin-bottom: 8px;">SYSTEM MESSAGE:</div>
            <div style="color: #86efac; line-height: 1.6;">
              Welcome to the future of trading, <span style="color: #4ade80; font-weight: bold;">{username}</span>!<br>
              Your trading terminal access is almost ready.
            </div>
          </div>

          <!-- OTP Section -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="color: #86efac; font-size: 13px; margin-bottom: 12px;">VERIFICATION CODE:</div>
            <div style="background: #0a0a0f; border: 2px solid #4ade80; border-radius: 12px; padding: 15px; display: inline-block;">
              <div style="color: #4ade80; font-size: 32px; font-weight: bold; letter-spacing: 6px;">
                {otp}
              </div>
            </div>
            <div style="color: #86efac; font-size: 11px; margin-top: 12px;">
              ⏱️ EXPIRES IN 10 MINUTES | KEEP SECURE
            </div>
          </div>

          <!-- Instructions -->
          <div style="background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3); border-radius: 8px; padding: 15px; margin: 20px 0;">
            <div style="color: #fbbf24; font-size: 12px; margin-bottom: 8px;">⚠️ SECURITY PROTOCOL:</div>
            <div style="color: #fef3c7; font-size: 11px; line-height: 1.5;">
              • Enter this code in your terminal to activate trading access<br>
              • Never share this code with anyone<br>
              • Code expires automatically for security
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid rgba(74, 222, 128, 0.3); margin-top: 30px; padding-top: 15px; text-align: center;">
            <div style="color: #4ade80; font-size: 11px; margin-bottom: 8px;">K9TX TERMINAL</div>
            <div style="color: #86efac; font-size: 9px;">
              Secure • Fast • Reliable Trading Platform<br>
              © {datetime.now().year} K9TX. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
    """
    
    return subject, text_content, html_content


def get_resend_verification_content(username, otp):
    """
    Generate resend verification email content
    
    Args:
        username (str): User's username
        otp (str): One-time password
    
    Returns:
        tuple: (subject, text_content, html_content)
    """
    subject = '✅ K9TX Terminal - Complete Email Verification'
    text_content = f'Your trading terminal email verification OTP is: {otp}. Valid for 10 minutes.'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Courier New', Consolas, monospace; background: #0a0a0f; color: #4ade80; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #1a1a2e; border: 1px solid #22d3ee; border-radius: 12px; padding: 30px;">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: rgba(34, 211, 238, 0.1); border: 1px solid #22d3ee; border-radius: 8px; padding: 15px;">
              <h1 style="color: #22d3ee; margin: 0; font-size: 22px; letter-spacing: 2px;">✅ EMAIL VERIFICATION</h1>
              <div style="color: #67e8f9; font-size: 12px; margin-top: 5px;">COMPLETE YOUR SETUP</div>
            </div>
          </div>

          <!-- Welcome Message -->
          <div style="background: rgba(0, 0, 0, 0.3); border-left: 3px solid #22d3ee; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0;">
            <div style="color: #22d3ee; font-size: 13px; margin-bottom: 8px;">VERIFICATION REQUIRED:</div>
            <div style="color: #67e8f9; line-height: 1.6;">
              Hello <span style="color: #22d3ee; font-weight: bold;">{username}</span>,<br>
              Complete your email verification to unlock full trading capabilities.
            </div>
          </div>

          <!-- OTP Section -->
          <div style="text-align: center; margin: 30px 0;">
            <div style="color: #67e8f9; font-size: 13px; margin-bottom: 12px;">VERIFICATION CODE:</div>
            <div style="background: #0a0a0f; border: 2px solid #22d3ee; border-radius: 12px; padding: 15px; display: inline-block;">
              <div style="color: #22d3ee; font-size: 32px; font-weight: bold; letter-spacing: 6px;">
                {otp}
              </div>
            </div>
            <div style="color: #67e8f9; font-size: 11px; margin-top: 12px;">
              ⏱️ EXPIRES IN 10 MINUTES
            </div>
          </div>

          <!-- Footer -->
          <div style="border-top: 1px solid rgba(34, 211, 238, 0.3); margin-top: 30px; padding-top: 15px; text-align: center;">
            <div style="color: #22d3ee; font-size: 11px; margin-bottom: 8px;">K9TX TERMINAL</div>
            <div style="color: #67e8f9; font-size: 9px;">
              Welcome to the future of trading<br>
              © {datetime.now().year} K9TX Capital Management. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
    """
    
    return subject, text_content, html_content
