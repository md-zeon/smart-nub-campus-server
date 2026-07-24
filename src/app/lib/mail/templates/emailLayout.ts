const APP_NAME = "Smart NUB Campus";

const baseCSS = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
`;

export function emailLayout(
  title: string,
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
  <title>${title}</title>
  <style>
    ${baseCSS}
    .header { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; }
    ${extraCSS}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${headerText}</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export { APP_NAME };
