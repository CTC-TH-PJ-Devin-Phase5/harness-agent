export const authTranslations: Record<'en' | 'th', Record<string, string>> = {
  en: {
    app_title: 'Company Car Booking',
    app_subtitle: 'Internal · Sign in to manage trips',
    work_email: 'Work email',
    password: 'Password',
    sign_in: 'Sign in',
    captcha_label: 'Security check',
    captcha_hint: 'Enter the code shown above',
    captcha_refresh: 'Get a new code',
    captcha_incorrect: "That code didn't match. Try the new one below.",
    login_inactive: 'This account has been deactivated. Contact an administrator.',
    login_no_account: 'No account found with that email.',
    login_bad_password: 'Incorrect email or password.',
    twofa_title: 'Two-factor verification',
    twofa_subtitle: 'Enter the code we sent to {email}.',
    twofa_demo_prefix: 'Demo code:',
    twofa_code_label: 'Verification code',
    twofa_verify: 'Verify & sign in',
    twofa_resend: 'Resend code',
    twofa_back: 'Back to sign in',
    twofa_invalid: 'Incorrect code. Please try again.',
    twofa_sent_notice: 'New code sent.',
  },
  th: {
    app_title: 'ระบบจองรถบริษัท',
    app_subtitle:
      'ภายในองค์กร · เข้าสู่ระบบเพื่อจัดการการเดินทาง',
    work_email: 'อีเมลที่ทำงาน',
    password: 'รหัสผ่าน',
    sign_in: 'เข้าสู่ระบบ',
    captcha_label: 'การตรวจสอบความปลอดภัย',
    captcha_hint: 'กรอกรหัสที่แสดงด้านบน',
    captcha_refresh: 'ขอรหัสใหม่',
    captcha_incorrect:
      'รหัสไม่ตรงกัน กรุณาลองรหัสใหม่ด้านล่าง',
    login_inactive:
      'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ',
    login_no_account:
      'ไม่พบบัญชีที่ใช้อีเมลนี้',
    login_bad_password:
      'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    twofa_title: 'การยืนยันสองขั้นตอน',
    twofa_subtitle:
      'กรอกรหัสที่เราส่งไปยัง {email}',
    twofa_demo_prefix:
      'รหัสสำหรับเดโม:',
    twofa_code_label: 'รหัสยืนยัน',
    twofa_verify:
      'ยืนยันและเข้าสู่ระบบ',
    twofa_resend: 'ส่งรหัสอีกครั้ง',
    twofa_back:
      'กลับไปหน้าเข้าสู่ระบบ',
    twofa_invalid:
      'รหัสไม่ถูกต้อง กรุณาลองใหม่',
    twofa_sent_notice: 'ส่งรหัสใหม่แล้ว',
  },
};
