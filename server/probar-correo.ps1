# Prueba rápida del servicio de correo (ejecutar con el servidor activo)
$body = @{
  destinatario = 'mauripereda@gmail.com'
  ordenador = 'Gerencia'
  numero = '00099'
  fecha = (Get-Date -Format 'dd/MM/yyyy')
  sector = 'COMPRAS'
  tipoPedido = 'COMPRA ESPECIAL'
  solicitante = 'Prueba sistema'
  jefeSector = 'Jefe de prueba'
  cantidadItems = 1
  panelUrl = 'http://127.0.0.1:5500/autorizacion.html?ordenador=gerencia'
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/notificar-ordenador' -Method Post -ContentType 'application/json' -Body $body
