---
id: mysql-archivista
nombre: El Archivista
especie: Custos memoriae
componente: VM de base de datos (MySQL, Debian 13)
sector: bovedas
estado: confirmado
individuos: 1
sprite: mysql-archivista
hitbox: [56, 56]
comportamiento: inmovil
estado_fotogenico: sacando_ficha
rango_ideal: [64, 160]
radio_huida: 0
host: titan-proxmox
relaciones: [titan-proxmox, terraform-arquitecta, ansible-simbiontes]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Máquina virtual de base de datos del homelab, con MySQL.

## ★★
VM Debian 13 clonada desde la plantilla con cloud-init. Cloud-init crea el usuario `debian` con la llave SSH del homelab.

- Versión de MySQL: ???
- Bases de datos: ???
- Pendiente: rol de Ansible para la base de datos.

## ★★★
<!-- comandos, notas, decisiones -->

## Registro
> "Abre un cajón, mira, lo cierra. Recuerda lo que nadie más recuerda."
