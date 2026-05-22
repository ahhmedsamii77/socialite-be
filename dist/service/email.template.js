"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailTemplate = emailTemplate;
function emailTemplate({ subject, otp, }) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap');
    
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }
    
    /* Responsive styles */
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 10px !important;
      }
      .card {
        padding: 36px 20px !important;
        border-radius: 16px !important;
      }
      .otp-code {
        font-size: 32px !important;
        letter-spacing: 6px !important;
        padding: 18px 12px !important;
      }
      .title {
        font-size: 22px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; background-color: #f4f4fa; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4fa; table-layout: fixed;">
    <tr>
      <td align="center" style="padding: 40px 10px 40px 10px;">
        <!--[if mso]>
        <table align="center" border="0" cellspacing="0" cellpadding="0" width="580">
        <tr>
        <td align="center" valign="top" width="580">
        <![endif]-->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="container" style="max-width: 580px; width: 100%;">
          
          <!-- BRAND LOGO HEADER -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${process.env.CLIENT_URL || '#'}" target="_blank" style="text-decoration: none; display: inline-block;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <!-- Modern typographic brand layout matching the frontend's Plus Jakarta Sans -->
                          <td style="padding-left: 8px;">
                            <span style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 800; color: #0f0f1a; letter-spacing: -0.5px;">
                              <span style="color: #7c3aed;">Socil</span><span style="color: #db2777;">alite</span>
                            </span>
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- MAIN CARD CONTENT -->
          <tr>
            <td class="card" style="background-color: #ffffff; border-radius: 20px; padding: 48px 40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04); border-top: 6px solid #7c3aed; border-left: 1px solid rgba(0, 0, 0, 0.03); border-right: 1px solid rgba(0, 0, 0, 0.03); border-bottom: 1px solid rgba(0, 0, 0, 0.03);">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Welcome/Security Icon -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0" style="background-color: rgba(124, 58, 237, 0.06); border-radius: 50%; width: 64px; height: 64px;">
                      <tr>
                        <td align="center" valign="middle" style="height: 64px; width: 64px;">
                          <!-- Keyhole/Shield SVG -->
                          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Email Subject -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <h1 class="title" style="margin: 0; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 26px; font-weight: 700; line-height: 1.3; color: #0f0f1a; text-align: center;">
                      ${subject}
                    </h1>
                  </td>
                </tr>
                
                <!-- Intro text -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #4a4a6a; text-align: center;">
                      We received a request to verify your action on **Socilalite**. Use the verification code below to complete the process. This code is valid for **1 minute** and can only be used once.
                    </p>
                  </td>
                </tr>
                
                <!-- OTP Verification Badge -->
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f0f1a; border-radius: 16px; box-shadow: 0 8px 30px rgba(124, 58, 237, 0.15); border: 1px solid rgba(124, 58, 237, 0.2);">
                      <tr>
                        <td class="otp-code" align="center" style="padding: 24px 16px; font-family: 'Plus Jakarta Sans', 'Inter', monospace; font-size: 40px; font-weight: 800; color: #ffffff; letter-spacing: 8px; text-shadow: 0 0 12px rgba(167, 139, 250, 0.35); text-align: center;">
                          ${otp}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Call To Action Button -->
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #7c3aed; border-radius: 12px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.3);">
                          <a href="${process.env.CLIENT_URL || '#'}" target="_blank" style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 14px 28px; display: inline-block;">
                            Launch Socilalite
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Security Warning -->
                <tr>
                  <td align="center" style="padding-top: 24px; border-top: 1px solid #f4f4fa;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 1.5; color: #8080a0; text-align: center;">
                      If you did not request this, you can safely ignore this email. Your account remains fully secure.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
          <!-- FOOTER / SOCIALS -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Social Icons -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Facebook -->
                        <td style="padding: 0 8px;">
                          <a href="${process.env.facebookLink || '#'}" target="_blank" style="text-decoration: none; display: inline-block; background-color: #ffffff; border-radius: 50%; width: 38px; height: 38px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.03);">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" height="100%">
                              <tr>
                                <td align="center" valign="middle" style="height: 38px; vertical-align: middle;">
                                  <!-- Visual spacer table hack for Outlook support -->
                                  <table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse: collapse;">
                                    <tr>
                                      <td align="center" valign="middle" style="line-height: 0;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#7c3aed" viewBox="0 0 24 24" style="display: block; margin: 0 auto;">
                                          <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                                        </svg>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        
                        <!-- Instagram -->
                        <td style="padding: 0 8px;">
                          <a href="${process.env.instegram || '#'}" target="_blank" style="text-decoration: none; display: inline-block; background-color: #ffffff; border-radius: 50%; width: 38px; height: 38px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.03);">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" height="100%">
                              <tr>
                                <td align="center" valign="middle" style="height: 38px; vertical-align: middle;">
                                  <table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse: collapse;">
                                    <tr>
                                      <td align="center" valign="middle" style="line-height: 0;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" style="display: block; margin: 0 auto;">
                                          <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                                          <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                                        </svg>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        
                        <!-- Twitter/X -->
                        <td style="padding: 0 8px;">
                          <a href="${process.env.twitterLink || '#'}" target="_blank" style="text-decoration: none; display: inline-block; background-color: #ffffff; border-radius: 50%; width: 38px; height: 38px; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); border: 1px solid rgba(0, 0, 0, 0.03);">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" height="100%">
                              <tr>
                                <td align="center" valign="middle" style="height: 38px; vertical-align: middle;">
                                  <table border="0" cellpadding="0" cellspacing="0" align="center" style="border-collapse: collapse;">
                                    <tr>
                                      <td align="center" valign="middle" style="line-height: 0;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#7c3aed" viewBox="0 0 16 16" style="display: block; margin: 0 auto;">
                                          <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
                                        </svg>
                                      </td>
                                    </tr>
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Copyright & Website Info -->
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #8080a0; text-align: center;">
                      &copy; ${new Date().getFullYear()} Socilalite. All rights reserved.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #8080a0; text-align: center; line-height: 1.5;">
                      You are receiving this security transaction email because you are a registered user of Socilalite. 
                      <br>
                      <a href="${process.env.CLIENT_URL || '#'}" target="_blank" style="color: #7c3aed; text-decoration: none; font-weight: 500; margin-top: 6px; display: inline-block;">View Website</a>
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
          
        </table>
        <!--[if mso]>
        </td>
        </tr>
        </table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
