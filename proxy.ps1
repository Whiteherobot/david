# CORS Proxy Server for PocketBase
$proxyPort = 3001
$targetUrl = "https://n1k0nsk2-8090.brs.devtunnels.ms"
$proxyUrl = "http://localhost:$proxyPort/"

Write-Host "Starting CORS Proxy Server..." -ForegroundColor Cyan
Write-Host "Proxy: $proxyUrl" -ForegroundColor Green
Write-Host "Target: $targetUrl" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($proxyUrl)
$listener.Start()

Write-Host "Proxy server started!" -ForegroundColor Green
Write-Host ""

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $path = $request.Url.PathAndQuery
        $targetUri = "$targetUrl$path"
        
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $($request.HttpMethod) $path" -ForegroundColor Gray
        
        # Handle OPTIONS preflight requests
        if ($request.HttpMethod -eq 'OPTIONS') {
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "*")
            $response.Headers.Add("Access-Control-Max-Age", "86400")
            $response.StatusCode = 200
            $response.Close()
            Write-Host "  -> 200 OK (Preflight)" -ForegroundColor Cyan
            continue
        }
        
        try {
            # Create web request
            $webRequest = [System.Net.WebRequest]::Create($targetUri)
            $webRequest.Method = $request.HttpMethod
            $webRequest.ContentType = $request.ContentType
            
            # Copy headers
            foreach ($header in $request.Headers.AllKeys) {
                if ($header -notin @('Host', 'Connection', 'Content-Length')) {
                    try {
                        $webRequest.Headers.Add($header, $request.Headers[$header])
                    } catch {}
                }
            }
            
            # Copy body for POST/PUT/PATCH
            if ($request.HttpMethod -in @('POST', 'PUT', 'PATCH')) {
                $webRequest.ContentLength = $request.ContentLength64
                $requestStream = $webRequest.GetRequestStream()
                $request.InputStream.CopyTo($requestStream)
                $requestStream.Close()
            }
            
            # Get response
            $webResponse = $webRequest.GetResponse()
            $responseStream = $webResponse.GetResponseStream()
            
            # Set CORS headers
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
            $response.Headers.Add("Access-Control-Allow-Headers", "*")
            $response.Headers.Add("Access-Control-Max-Age", "86400")
            
            # Copy response headers
            foreach ($header in $webResponse.Headers.AllKeys) {
                if ($header -notin @('Transfer-Encoding', 'Content-Length')) {
                    try {
                        $response.Headers.Add($header, $webResponse.Headers[$header])
                    } catch {}
                }
            }
            
            $response.ContentType = $webResponse.ContentType
            $response.StatusCode = [int]$webResponse.StatusCode
            
            # Copy response body
            $responseStream.CopyTo($response.OutputStream)
            $responseStream.Close()
            
            Write-Host "  -> $($webResponse.StatusCode)" -ForegroundColor Green
        }
        catch [System.Net.WebException] {
            $errorResponse = $_.Exception.Response
            if ($errorResponse) {
                $response.StatusCode = [int]$errorResponse.StatusCode
                $errorStream = $errorResponse.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorBody = $reader.ReadToEnd()
                $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorBody)
                
                $response.Headers.Add("Access-Control-Allow-Origin", "*")
                $response.ContentType = "application/json"
                $response.ContentLength64 = $errorBytes.Length
                $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
                
                Write-Host "  -> $($errorResponse.StatusCode)" -ForegroundColor Red
            }
        }
        catch {
            $response.StatusCode = 500
            $errorMsg = @{error = $_.Exception.Message} | ConvertTo-Json
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
            
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.ContentType = "application/json"
            $response.ContentLength64 = $errorBytes.Length
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
            
            Write-Host "  -> Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        $response.Close()
    }
}
finally {
    $listener.Stop()
    Write-Host "`nProxy server stopped." -ForegroundColor Yellow
}
