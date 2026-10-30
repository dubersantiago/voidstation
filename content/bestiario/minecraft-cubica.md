---
id: minecraft-cubica
nombre: Criatura Cúbica
especie: Cubozoa ludens
componente: VM de servidor de Minecraft (Debian 13)
sector: bovedas
estado: confirmado
individuos: 1
sprite: minecraft-cubica
hitbox: [28, 28]
comportamiento: deambular
estado_fotogenico: terminando_construccion
rango_ideal: [32, 96]
radio_huida: 0
host: titan-proxmox
relaciones: [titan-proxmox, ansible-simbiontes]
publico: true
luz_propia: false            # true = emite luz propia (§4)
---

## ★
Máquina virtual del servidor de Minecraft del homelab.

## ★★
VM Debian 13 clonada desde la plantilla con cloud-init.

La configura el rol de Ansible `minecraft`:
- Servidor Paper 26.3 (build 205) con `openjdk-25-jre-headless`.
- Corre como servicio systemd.
- Máximo 10 jugadores, `view-distance` 6, `simulation-distance` 4, `online-mode` activado.

## ★★★
Aplicar solo la configuración del servidor:

```bash
cd ansible
ansible-playbook playbooks/site.yml --limit minecraft
```

## Registro
> "Construye cosas pequeñas y las deshace. Parece que juega."
