---
id: talos-reina
nombre: Reina Centinela
especie: Formica immutabilis regina
componente: Talos Linux — nodo control plane
sector: colmena
estado: confirmado
individuos: 3
sprite: talos-reina
hitbox: [40, 40]
comportamiento: inmovil
estado_fotogenico: pulso_sincronizado
rango_ideal: [48, 128]
radio_huida: 0
host: titan-proxmox
relaciones: [talos-obrera, titan-proxmox]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Nodo control plane del cluster Kubernetes del homelab, sobre Talos Linux.

## ★★
Tres control plane en VMs de Proxmox creadas por Terraform desde el ISO de Talos. Talos no tiene SSH ni shell: se gestiona solo por API.

El API de Kubernetes se publica en una VIP de capa 2 (`Layer2VIPConfig`) que comparten los control plane. Disco de instalación: `/dev/sda`.

- Versión de Talos: ???
- Versión de Kubernetes: ???

## ★★★
Generar las configuraciones del cluster:

```bash
./talos/generate.sh
```

Ejecuta `talosctl gen config` con `secrets.yaml` (no versionado; imprescindible para regenerar configuraciones válidas del mismo cluster) y aplica a cada `nodes/cp-*.yaml` el patch común y el del nodo. El resultado queda en `_out/<nodo>.yaml`.

Agregar un control plane:
1. VM nueva en `local.vms` de `machines.tf` con el ISO de Talos y `cloud_init = false`.
2. `talos/nodes/<nombre>.yaml` con `HostnameConfig`, `LinkConfig` y la VIP.
3. Ejecutar `generate.sh` y aplicar la configuración generada al nodo.

## Registro
> "Tres reinas, una sola voz. Ninguna decide sola."
