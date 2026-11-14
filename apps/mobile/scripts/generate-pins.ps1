# Gera os bitmaps dos pins do mapa (plano ocorrencias-criacao-e-mapa, 2026-11-14).
# Pin estilo Waze com a identidade do Cidade+: anel na cor do status (Figma), miolo branco,
# ilustracao da categoria recortada (mesmo recorte do Figma) e cauda apontando para o local.
# Saida: assets/pins/pin-<categoria>-<status>[-sel]@2x.png e @3x.png + lib/pin-images.ts
# Uso (PowerShell, na pasta apps/mobile):  powershell -ExecutionPolicy Bypass -File scripts/generate-pins.ps1

Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$artDir = Join-Path $root "assets\figma"
$outDir = Join-Path $root "assets\pins"
New-Item -ItemType Directory -Force $outDir | Out-Null

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
$variants = @(@{ suffix = ""; d = 44 }, @{ suffix = "-sel"; d = 54 })
$scales = @(2, 3)

function New-Pin($artPath, $crop, $ringHex, $d, $s, $outPath) {
  $w = [int](($d + 6) * $s)
  $h = [int](($d + 16) * $s)
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)

  $ring = [System.Drawing.ColorTranslator]::FromHtml($ringHex)
  $cx = $w / 2.0
  $cy = (3 + $d / 2.0) * $s
  $r = $d / 2.0 * $s

  # Sombra suave (camadas concentricas translucidas, deslocadas para baixo)
  for ($i = 3; $i -ge 1; $i--) {
    $alpha = 18 * (4 - $i)
    $shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 0, 0, 0))
    $sr = $r + $i * 0.6 * $s
    $g.FillEllipse($shadow, [single]($cx - $sr), [single]($cy - $sr + 1.5 * $s), [single](2 * $sr), [single](2 * $sr))
    $shadow.Dispose()
  }

  # Cauda (triangulo) apontando para o ponto exato (base do bitmap = ancora)
  $ringBrush = New-Object System.Drawing.SolidBrush $ring
  $tail = @(
    (New-Object System.Drawing.PointF ([single]($cx - 8 * $s)), ([single]($cy + $r - 7 * $s))),
    (New-Object System.Drawing.PointF ([single]($cx + 8 * $s)), ([single]($cy + $r - 7 * $s))),
    (New-Object System.Drawing.PointF ([single]$cx), ([single]($h - 1)))
  )
  $g.FillPolygon($ringBrush, $tail)

  # Anel na cor do status + miolo claro
  $g.FillEllipse($ringBrush, [single]($cx - $r), [single]($cy - $r), [single](2 * $r), [single](2 * $r))
  $inner = $r - 3 * $s
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml("#FAFAFA"))
  $g.FillEllipse($white, [single]($cx - $inner), [single]($cy - $inner), [single](2 * $inner), [single](2 * $inner))

  # Ilustracao recortada num circulo (1 px de folga dentro do miolo)
  $box = 2 * ($inner - 1 * $s)
  $bx = $cx - $box / 2
  $by = $cy - $box / 2
  $clip = New-Object System.Drawing.Drawing2D.GraphicsPath
  $clip.AddEllipse([single]$bx, [single]$by, [single]$box, [single]$box)
  $g.SetClip($clip)
  $art = [System.Drawing.Image]::FromFile($artPath)
  $g.DrawImage($art, [single]($bx + $box * $crop[2]), [single]($by + $box * $crop[3]), [single]($box * $crop[0]), [single]($box * $crop[1]))
  $g.ResetClip()

  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $art.Dispose(); $clip.Dispose(); $white.Dispose(); $ringBrush.Dispose(); $g.Dispose(); $bmp.Dispose()
}

$ts = New-Object System.Text.StringBuilder
[void]$ts.AppendLine("// GERADO por scripts/generate-pins.ps1 - nao edite a mao.")
[void]$ts.AppendLine("// Pins do mapa pre-renderizados (categoria x status x normal/selecionado).")
[void]$ts.AppendLine("// require() de imagem local devolve um id numerico (aceito por Marker.image e Image.source).")
[void]$ts.AppendLine("")
[void]$ts.AppendLine("export const PIN_IMAGES: Record<string, number> = {")

foreach ($cat in $categories.Keys) {
  foreach ($status in $statuses.Keys) {
    foreach ($v in $variants) {
      $name = "pin-$cat-$status$($v.suffix)"
      foreach ($s in $scales) {
        New-Pin (Join-Path $artDir "category-$cat.png") $categories[$cat] $statuses[$status] $v.d $s (Join-Path $outDir "$name@$($s)x.png")
      }
      [void]$ts.AppendLine("  `"$cat/$status$($v.suffix)`": require(`"../assets/pins/$name.png`"),")
    }
  }
}
[void]$ts.AppendLine("};")
[void]$ts.AppendLine("")
[void]$ts.AppendLine("/** Tamanho logico (pt/dp) de cada variante; a ponta da cauda fica na base (anchor y = 1). */")
[void]$ts.AppendLine("export const PIN_SIZE = { normal: { width: 50, height: 60 }, selected: { width: 60, height: 70 } } as const;")
[System.IO.File]::WriteAllText((Join-Path $root "lib\pin-images.ts"), $ts.ToString(), (New-Object System.Text.UTF8Encoding $false))
"ok: $((Get-ChildItem $outDir -Filter *.png).Count) arquivos"
