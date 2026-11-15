# Gera os bitmaps dos marcadores do mapa (plano ocorrencias-criacao-e-mapa; D-027).
# Bitmaps (e nao Views) por causa do P-013 (snapshot cortado no Android). Sem agrupamento.
#   dot-<status>-<d>        bolinha na cor do status com contorno branco (so com o mapa bem afastado)
#   pin-<cat>-<status>-<d>  icone: pin com ilustracao da categoria e anel do status (diminui ao afastar)
#   pin-<cat>-<status>-sel  selecionado (58, um so tamanho)
# Os tamanhos DEVEM bater com lib/map-markers.ts (MARKER_SIZES, SELECTED_PIN_SIZE, pinHeight).
# Saida: assets/pins/*@2x.png e @3x.png + lib/pin-images.ts
# Uso (PowerShell, na pasta apps/mobile):  powershell -ExecutionPolicy Bypass -File scripts/generate-pins.ps1

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$artDir = Join-Path $root "assets\figma"
$outDir = Join-Path $root "assets\pins"
New-Item -ItemType Directory -Force $outDir | Out-Null
# Os PNGs desta pasta sao todos gerados aqui: limpa para nao sobrar variante antiga.
Get-ChildItem $outDir -Filter *.png | Remove-Item -Force

# Recorte das ilustracoes (igual a lib/category-art.ts): largura, altura, esquerda, topo (fracoes do quadro)
$categories = [ordered]@{
  "infraestrutura" = @(1.513, 0.8431, -0.2439, 0.0459)
  "limpeza"        = @(1.5577, 0.8459, -0.2853, 0.058)
  "seguranca"      = @(1.6632, 0.9314, -0.3316, 0.0411)
  "transito"       = @(1.5869, 0.9088, -0.3066, 0.0453)
  "outros"         = @(1.3331, 0.7382, -0.1726, 0.1249)
}
# 4 estados visuais do Figma (theme.ts -> statusVisualColors.dot)
$statuses = [ordered]@{
  "analise"   = "#F97216"
  "andamento" = "#0D3A9F"
  "resolvido" = "#0B701A"
  "negado"    = "#AC0C0C"
}
$dotSizes = @(10, 12, 14)
$pinSizes = @(28, 32, 36, 40, 44, 48, 52)
$selectedSize = 58
$scales = @(2, 3)

function New-Canvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap ([int]$w), ([int]$h), ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($bmp, $g)
}

function Fill-Circle($g, $color, $cx, $cy, $r) {
  $brush = New-Object System.Drawing.SolidBrush $color
  $g.FillEllipse($brush, [single]($cx - $r), [single]($cy - $r), [single](2 * $r), [single](2 * $r))
  $brush.Dispose()
}

function Draw-Shadow($g, $cx, $cy, $r, $s, $strength) {
  for ($i = 3; $i -ge 1; $i--) {
    $alpha = [int]($strength * (4 - $i))
    $c = [System.Drawing.Color]::FromArgb($alpha, 0, 0, 0)
    Fill-Circle $g $c $cx ($cy + 1.0 * $s) ($r + $i * 0.5 * $s)
  }
}

function Draw-Art($g, $artPath, $crop, $cx, $cy, $radius) {
  $box = 2 * $radius
  $bx = $cx - $radius
  $by = $cy - $radius
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clip.AddEllipse([single]$bx, [single]$by, [single]$box, [single]$box)
  $g.SetClip($clip)
  $art = [System.Drawing.Image]::FromFile($artPath)
  $g.DrawImage($art, [single]($bx + $box * $crop[2]), [single]($by + $box * $crop[3]), [single]($box * $crop[0]), [single]($box * $crop[1]))
  $g.ResetClip()
  $art.Dispose(); $clip.Dispose()
}

$white = [System.Drawing.ColorTranslator]::FromHtml("#FFFFFF")
$paper = [System.Drawing.ColorTranslator]::FromHtml("#FAFAFA")

# Bolinha: contorno branco (2) + status. Quadro com folga de 2 para a sombra; ancora no centro.
function New-Dot($hex, $d, $s, $out) {
  $w = ($d + 4) * $s
  $c = New-Canvas $w $w; $bmp = $c[0]; $g = $c[1]
  $cx = $w / 2.0; $r = $d / 2.0 * $s
  Draw-Shadow $g $cx $cx $r $s 12
  Fill-Circle $g $white $cx $cx $r
  Fill-Circle $g ([System.Drawing.ColorTranslator]::FromHtml($hex)) $cx $cx ($r - 2 * $s)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
}

# Pin (o mesmo desenho validado antes): anel do status, miolo, ilustracao e cauda.
# Cauda proporcional ao diametro (13/44 abaixo do circulo; igual a pinHeight() no TS):
# altura logica = 3 + d + round(d*13/44). A ponta da cauda e a base do bitmap -> anchor (0.5, 1).
function New-Pin($artPath, $crop, $hex, $d, $s, $out) {
  $tail = [math]::Round($d * 13 / 44, [System.MidpointRounding]::AwayFromZero)
  $k = $d / 44.0
  $w = ($d + 6) * $s
  $h = ($d + 3 + $tail) * $s
  $c = New-Canvas $w $h; $bmp = $c[0]; $g = $c[1]
  $ring = [System.Drawing.ColorTranslator]::FromHtml($hex)
  $cx = $w / 2.0
  $cy = (3 + $d / 2.0) * $s
  $r = $d / 2.0 * $s
  for ($i = 3; $i -ge 1; $i--) {
    $alpha = 18 * (4 - $i)
    Fill-Circle $g ([System.Drawing.Color]::FromArgb($alpha, 0, 0, 0)) $cx ($cy + 1.5 * $s) ($r + $i * 0.6 * $s)
  }
  $ringBrush = New-Object System.Drawing.SolidBrush $ring
  $tailPts = @(
    (New-Object System.Drawing.PointF ([single]($cx - 8 * $k * $s)), ([single]($cy + $r - 7 * $k * $s))),
    (New-Object System.Drawing.PointF ([single]($cx + 8 * $k * $s)), ([single]($cy + $r - 7 * $k * $s))),
    (New-Object System.Drawing.PointF ([single]$cx), ([single]($h - 1)))
  )
  $g.FillPolygon($ringBrush, $tailPts)
  $ringBrush.Dispose()
  Fill-Circle $g $ring $cx $cy $r
  $ringWidth = [math]::Max(2.5, 3 * $k)
  $inner = $r - $ringWidth * $s
  Fill-Circle $g $paper $cx $cy $inner
  Draw-Art $g $artPath $crop $cx $cy ($inner - [math]::Max(0.5, $k) * $s)
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
}

$ts = New-Object System.Text.StringBuilder
[void]$ts.AppendLine("// GERADO por scripts/generate-pins.ps1 - nao edite a mao.")
[void]$ts.AppendLine("// Marcadores do mapa pre-renderizados (D-027). Chaves:")
[void]$ts.AppendLine("//   dot/<status>/<d>   pin/<categoria>/<status>/<d>|sel")
[void]$ts.AppendLine("// require() de imagem local devolve um id numerico (aceito por Marker.image e Image.source).")
[void]$ts.AppendLine("")
[void]$ts.AppendLine("export const MARKER_IMAGES: Record<string, number> = {")

foreach ($status in $statuses.Keys) {
  foreach ($d in $dotSizes) {
    $name = "dot-$status-$d"
    foreach ($s in $scales) { New-Dot $statuses[$status] $d $s (Join-Path $outDir "$name@$($s)x.png") }
    [void]$ts.AppendLine("  `"dot/$status/$d`": require(`"../assets/pins/$name.png`"),")
  }
}
foreach ($cat in $categories.Keys) {
  $artPath = Join-Path $artDir "category-$cat.png"
  foreach ($status in $statuses.Keys) {
    $sel = "pin-$cat-$status-sel"
    foreach ($s in $scales) { New-Pin $artPath $categories[$cat] $statuses[$status] $selectedSize $s (Join-Path $outDir "$sel@$($s)x.png") }
    [void]$ts.AppendLine("  `"pin/$cat/$status/sel`": require(`"../assets/pins/$sel.png`"),")
    foreach ($d in $pinSizes) {
      $name = "pin-$cat-$status-$d"
      foreach ($s in $scales) { New-Pin $artPath $categories[$cat] $statuses[$status] $d $s (Join-Path $outDir "$name@$($s)x.png") }
      [void]$ts.AppendLine("  `"pin/$cat/$status/$d`": require(`"../assets/pins/$name.png`"),")
    }
  }
}
[void]$ts.AppendLine("};")
[System.IO.File]::WriteAllText((Join-Path $root "lib\pin-images.ts"), $ts.ToString(), (New-Object System.Text.UTF8Encoding $false))
"ok: $((Get-ChildItem $outDir -Filter *.png).Count) arquivos"
