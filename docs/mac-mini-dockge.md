# Mac mini deployment with OrbStack and Dockge

Run OrbStack as the Docker engine, Dockge as the Compose manager, and Character Keeper as one stack. Use the repository's existing `compose.yaml` and `Dockerfile`; the image builds for the host's native architecture without a forced `platform` setting. No host Node.js installation is required.

## 1. Check OrbStack and Dockge

On the Mac mini, start OrbStack and select its Docker context:

```sh
docker context use orbstack
docker info
docker compose version
```

In OrbStack's Docker settings, enable **Expose ports to LAN**. Published ports are then accessible through the Mac's network address. See [OrbStack networking](https://docs.orbstack.dev/docker/network).

If Dockge already runs, keep its current configuration. Find its `DOCKGE_STACKS_DIR` and the corresponding host volume mount. The stacks directory must have the **same absolute path inside and outside Dockge**, as required by [Dockge's installation instructions](https://github.com/louislam/dockge#how-to-install).

For example, a Mac-owned stacks directory could be configured in Dockge's Compose file as follows (replace `YOUR_MAC_USERNAME` in all three places):

```yaml
services:
  dockge:
    image: louislam/dockge:1
    restart: unless-stopped
    ports:
      - "5001:5001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./data:/app/data
      - /Users/YOUR_MAC_USERNAME/docker/stacks:/Users/YOUR_MAC_USERNAME/docker/stacks
    environment:
      DOCKGE_STACKS_DIR: /Users/YOUR_MAC_USERNAME/docker/stacks
```

For a new Dockge installation, create that stacks directory, save this example as `compose.yaml` in a separate directory such as `~/docker/dockge`, and run `docker compose up -d` there. Open `http://localhost:5001` on the Mac to complete account setup. Keep Dockge's management interface on your trusted network.

## 2. Put the full app in the stacks folder

Run these commands in **macOS Terminal or an SSH session to the Mac**, using your actual stacks path:

```sh
STACKS_DIR="/Users/YOUR_MAC_USERNAME/docker/stacks"
cd "$STACKS_DIR"
git clone git@github.com:tikitikitrey04/d-and-d-character-tracker.git d-d-character-tracker
cd d-d-character-tracker
```

The Mac needs GitHub SSH access for that clone URL. Alternatively, clone using HTTPS and your normal GitHub authentication:

```sh
git clone https://github.com/tikitikitrey04/d-and-d-character-tracker.git d-d-character-tracker
```

Use one clone command, not both. Keep the entire repository in this folder: `build: .` requires the Dockerfile, source, and package files alongside Compose. Pasting only the Compose YAML into an empty Dockge stack cannot build the app.

The GitHub repository is named `d-and-d-character-tracker`. The local stack folder stays `d-d-character-tracker` to preserve the existing Compose project and database volume. If you cloned before the repository was renamed, update its remote from that folder:

```sh
git remote set-url origin https://github.com/tikitikitrey04/d-and-d-character-tracker.git
```

If your clone uses SSH, use `git@github.com:tikitikitrey04/d-and-d-character-tracker.git` instead.

The defaults already publish port 3001 with working HTTP sign-in. For custom settings, copy `.env.example` to `.env` if available, or create `.env` beside `compose.yaml` containing:

```dotenv
APP_BIND_ADDRESS=0.0.0.0
APP_PORT=3001
SECURE_COOKIES=false
```

These values can also be edited in Dockge. Choose another `APP_PORT` if 3001 is occupied.

## 3. Deploy and use the app

In Dockge, open the top-right menu and select **Scan Stacks Folder**. Open **d-d-character-tracker** and deploy it. The first deployment builds the app and installs its container dependencies, so allow a few minutes. Dockge can subsequently stop, start, restart, and show logs for this stack. See [Dockge's existing-stack instructions](https://github.com/louislam/dockge#can-i-manage-existing-stacks).

You can also perform the initial build from the app directory on the Mac:

```sh
docker compose up -d --build --wait
docker compose ps
curl --fail http://localhost:3001/healthz
```

Expect a healthy container and `{"ok":true}`. Dockge manages this same stack after scanning it.

On a phone, tablet, or computer on the network, open **http://MAC-MINI-LAN-IP:3001**. Find the Mac's address in **System Settings → Network → active connection → Details → TCP/IP**. Use the configured port if different. Reserve the address in your router so it stays stable.

If localhost works but other devices cannot connect, check OrbStack's **Expose ports to LAN**, the macOS firewall, and network/VLAN rules between those devices and the server rack. Keep the Mac awake while serving the app and configure OrbStack to start at login. `restart: unless-stopped` restarts the app when its Docker engine starts; it does not start OrbStack or log into macOS after a reboot. Verify availability after a real reboot before relying on unattended operation.

## 4. Updates

From the app directory on the Mac, back up the database as described below, then:

```sh
git pull --ff-only
docker compose up -d --build --wait
```

Dockge continues to manage the same containers. An image pull alone does not retrieve application changes: this stack builds from the checked-out Git repository. Keep custom ports in `.env` so updates do not require edits to the tracked Compose file.

## 5. Data, migration, and backups

Accounts and characters live in a Docker named volume, separate from the source checkout. Keep the stack folder/project name **d-d-character-tracker** stable; changing it selects a different project-prefixed volume. Rebuilds and normal stack removal preserve data; removing the volume deletes it. A fresh Mac deployment starts empty until you migrate data or create accounts.

To move existing data from another Docker host, stop the source app and copy out its entire database directory on that host:

```sh
docker compose stop
docker compose cp app:/app/data ./keeper-transfer
docker compose start
```

Transfer `keeper-transfer` to the Mac, for example with SCP or a file share. For an existing Node deployment, stop its server and transfer its complete `data` directory instead. Copy SQLite's accompanying WAL/SHM files too if present.

Before using the Mac's fresh database, run from its app directory, replacing the source path below with the transferred directory:

```sh
docker compose build
docker compose create
docker compose cp /absolute/path/to/keeper-transfer/. app:/app/data/
docker compose run --rm --no-deps --user root app chown -R node:node /app/data
docker compose up -d --wait
```

If the destination app has started, stop it first. Import only into an empty destination; these commands overwrite database files. Sign in with your existing account afterward to check the migration.

For subsequent backups, run from the Mac's app directory:

```sh
BACKUP_DIR="$HOME/character-keeper-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
docker compose stop
docker compose cp app:/app/data "$BACKUP_DIR/"
docker compose start
```

Keep a copy of backups outside the Mac. To restore, stop the app, preserve its current database separately, and use the import process with the backup's `data` directory as the source.
