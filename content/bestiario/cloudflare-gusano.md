---
id: cloudflare-gusano
nombre: Gusano de Túnel
especie: Vermis tunelaris
componente: Cloudflare Tunnel (LXC)
sector: muelle
estado: confirmado
individuos: 1
sprite: cloudflare-gusano
hitbox: [224, 56]
comportamiento: inmovil
estado_fotogenico: pulso
rango_ideal: [80, 160]
radio_huida: 0
host: titan-proxmox
relaciones: [titan-proxmox, jenkins-vigia]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Túnel de Cloudflare: la vía por la que internet llega a los servicios del homelab, que no tiene IP pública.

## ★★
Corre en un contenedor LXC creado por Terraform con el módulo `proxmox-lxc`. Expone, entre otros, Jenkins.

- Servicios expuestos (lista completa): ???

## ★★★
<!-- comandos, notas, decisiones -->

## Registro
> "Su cuerpo atraviesa el casco. Nadie ha visto dónde termina."
