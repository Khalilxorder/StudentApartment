/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: API Documentation
 *     description: Returns Swagger UI for API documentation
 *     tags: [Documentation]
 *     responses:
 *       200:
 *         description: Swagger UI HTML
 */

import { NextResponse } from 'next/server';

export async function GET() {
    // Swagger UI HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Student Apartments API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/spec',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
      });
    };
  </script>
</body>
</html>
  `;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}
