# Simple HTTP Server for StreamFlix
$port = 3000
$url = "http://localhost:$port/"

Write-Host "Starting StreamFlix Server..." -ForegroundColor Cyan
Write-Host "Server running at: $url" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Create HTTP Listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

# Open browser
Start-Process $url

Write-Host "Server started successfully!" -ForegroundColor Green
Write-Host "Waiting for requests..." -ForegroundColor Gray
Write-Host ""

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.LocalPath
        if ($path -eq "/") {
            $path = "/index.html"
        }
        
        $filePath = Join-Path $PSScriptRoot $path.TrimStart('/')
        
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $($request.HttpMethod) $path" -ForegroundColor Gray
        
        if (Test-Path $filePath -PathType Leaf) {
            # Determine content type
            $contentType = "text/html"
            $ext = [System.IO.Path]::GetExtension($filePath)
            switch ($ext) {
                ".html" { $contentType = "text/html; charset=utf-8" }
                ".css" { $contentType = "text/css; charset=utf-8" }
                ".js" { $contentType = "application/javascript; charset=utf-8" }
                ".json" { $contentType = "application/json; charset=utf-8" }
                ".png" { $contentType = "image/png" }
                ".jpg" { $contentType = "image/jpeg" }
                ".jpeg" { $contentType = "image/jpeg" }
                ".gif" { $contentType = "image/gif" }
                ".svg" { $contentType = "image/svg+xml" }
            }
            
            # Read and send file
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $content.Length
            $response.StatusCode = 200
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        else {
            # 404 Not Found
            $response.StatusCode = 404
            $content = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found: $path")
            $response.ContentLength64 = $content.Length
            $response.OutputStream.Write($content, 0, $content.Length)
            Write-Host "  -> 404 Not Found" -ForegroundColor Red
        }
        
        $response.Close()
    }
}
finally {
    $listener.Stop()
    Write-Host "`nServer stopped." -ForegroundColor Yellow
}
