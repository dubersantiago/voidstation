---
id: titan-proxmox
nombre: Titán de Carga
especie: Titanus hypervisor
componente: Proxmox VE — nodo físico
sector: titanes
estado: confirmado
individuos: 3
sprite: titan-proxmox
hitbox: [144, 96]
comportamiento: inmovil
estado_fotogenico: crisalida_encendida
rango_ideal: [96, 200]
radio_huida: 0
host: '-'                     # es el propio nodo físico
relaciones: [terraform-arquitecta]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Nodo físico de Proxmox, el hipervisor del homelab. Sostiene las máquinas virtuales y los contenedores LXC.

## ★★
El cluster de Proxmox tiene tres nodos. Terraform crea en ellos las VMs y los contenedores LXC.

Cada nodo usa almacenamiento local (`local-lvm`) y el bridge `vmbr0`. Como el almacenamiento es local, clonar entre nodos no funciona bien: cada nodo tiene su propia plantilla Debian 13 con cloud-init.

- Versión de Proxmox: ???

## ★★★
Crear la plantilla de un nodo: ejecutar `scripts/Templates-qm.sh` como root en la shell del nodo, cambiando antes `id` por un ID libre (los IDs son únicos en todo el cluster).

El script descarga `debian-13-genericcloud-amd64.qcow2`, la importa como disco `scsi0` en `local-lvm` y convierte la VM en plantilla. El disco debe ser `scsi0` porque el módulo de Terraform lo define en esa interfaz. El drive de cloud-init no va en la plantilla: lo crea Terraform al clonar.

## Registro
> "Respiran despacio. Lo que cargan en el lomo depende de que no se detengan."
