---
id: talos-obrera
nombre: Obrera Inmutable
especie: Formica immutabilis
componente: Talos Linux — nodo worker
sector: colmena
estado: confirmado
individuos: 3
sprite: talos-obrera
hitbox: [20, 16]
comportamiento: enjambre
estado_fotogenico: cargando
rango_ideal: [32, 96]
radio_huida: 48
host: titan-proxmox
relaciones: [talos-reina, titan-proxmox]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Nodo worker del cluster Kubernetes del homelab. Ejecuta las cargas de trabajo.

## ★★
Tres workers en VMs de Proxmox creadas por Terraform desde el ISO de Talos. Sistema inmutable: sin SSH, se gestiona solo por API.

## ★★★
Las configuraciones de los workers salen de `./talos/generate.sh`, igual que las del control plane: cada `nodes/worker-*.yaml` se aplica sobre `worker.yaml`.

Agregar un worker: VM nueva en `machines.tf` con el ISO de Talos, archivo `talos/nodes/<nombre>.yaml` con `HostnameConfig` y `LinkConfig`, `generate.sh` y aplicar la configuración al nodo.

## Registro
> "Llevan cápsulas que no abren. Nunca se detienen."
