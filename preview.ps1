# Local preview of the website, using only what Windows ships (PowerShell + .NET). No Python, no Node.
#   powershell -ExecutionPolicy Bypass -File .\preview.ps1          (then open http://localhost:8099/)
# Ctrl+C stops it. Serves this folder on this PC only (localhost), and maps clean URLs like /features to features.html
# the way netlify.toml does.
param([int]$Port = 8099)
$root = $PSScriptRoot
$types = @{ ".html"="text/html; charset=utf-8"; ".css"="text/css"; ".js"="text/javascript"; ".json"="application/json"
            ".png"="image/png"; ".jpg"="image/jpeg"; ".svg"="image/svg+xml"; ".webmanifest"="application/manifest+json"
            ".txt"="text/plain; charset=utf-8"; ".xml"="application/xml"; ".woff2"="font/woff2"; ".ttf"="font/ttf"
            ".zip"="application/zip"; ".ico"="image/x-icon"; ".webp"="image/webp" }
$http = [System.Net.HttpListener]::new()
$http.Prefixes.Add("http://localhost:$Port/")
$http.Start()
Write-Host "TRACE website preview: http://localhost:$Port/   (Ctrl+C to stop)"
try {
  while ($http.IsListening) {
    $ctx = $http.GetContext()
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart("/")
    if ($path -eq "") { $path = "index.html" }
    $file = Join-Path $root $path
    if (-not (Test-Path $file -PathType Leaf) -and (Test-Path "$file.html" -PathType Leaf)) { $file = "$file.html" }
    $full = [System.IO.Path]::GetFullPath($file)
    $res = $ctx.Response
    if ($full.StartsWith($root) -and (Test-Path $full -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $res.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $nf = Join-Path $root "404.html"
      $bytes = if (Test-Path $nf) { [System.IO.File]::ReadAllBytes($nf) } else { [Text.Encoding]::UTF8.GetBytes("404") }
      $res.ContentType = "text/html; charset=utf-8"
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    }
    $res.Close()
  }
} finally { $http.Stop() }
