const APP_NAME = "Smart NUB Campus";
const SUPPORT_EMAIL = "support@smartnubcampus.com";

const baseCSS = `
    body { margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f4f5f7; padding: 40px 0; }
    .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .header { padding: 32px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; color: #ffffff; letter-spacing: -0.01em; }
    .content { padding: 32px 40px; }
    .content h2 { margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1a1a2e; line-height: 1.3; }
    .content p { margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4a4a68; }
    .content p:last-child { margin-bottom: 0; }
    .greeting { font-size: 15px; color: #4a4a68; margin-bottom: 16px !important; }
    .footer { padding: 24px 40px; text-align: center; border-top: 1px solid #f0f0f5; }
    .footer p { margin: 0 0 4px 0; font-size: 12px; line-height: 1.5; color: #9898b0; }
    .footer a { color: #6366f1; text-decoration: none; }
    .footer a:hover { text-decoration: underline; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .wrapper { background-color: #1a1a2e !important; }
      .container { background-color: #232340 !important; box-shadow: 0 1px 3px rgba(0,0,0,0.3) !important; }
      .content h2 { color: #f0f0f5 !important; }
      .content p { color: #b8b8d0 !important; }
      .greeting { color: #b8b8d0 !important; }
      .footer { border-top-color: #2e2e50 !important; }
      .footer p { color: #7878a0 !important; }
      .footer a { color: #818cf8 !important; }
    }
    @media only screen and (max-width: 600px) {
      .wrapper { padding: 20px 0 !important; }
      .container { margin: 0 12px !important; border-radius: 8px !important; }
      .header { padding: 24px 24px !important; }
      .content { padding: 24px 24px !important; }
      .content h2 { font-size: 20px !important; }
      .footer { padding: 20px 24px !important; }
    }
`;

export function emailLayout(
  title: string,
  preheader: string,
  headerColor: string,
  headerText: string,
  extraCSS: string,
  bodyContent: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    ${baseCSS}
    .header { background-color: ${headerColor}; }
    ${extraCSS}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${headerText}</h1>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
        <p>Need help? <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export { APP_NAME, SUPPORT_EMAIL };