# Lab: ApplicationSet rename

Runnable companion to the post
**[Renaming an Argo CD ApplicationSet without deleting your workloads](https://hradecheck.com/posts/argocd-applicationset-rename/)**.

The post explains *why* any of this happens and shows the expected output of every step. This file
is only the operational side: what to install, how to get into the UI, and the command sequence
without the commentary.

Throwaway kind cluster, public demo app, no production involved.

## Prerequisites

A running Docker daemon, plus `kubectl` and `kind`. The `argocd` CLI is optional but makes the UI
login easier.

### Installing kind

Linux:

```bash
curl -Lo ./kind https://kind.sigs.k8s.io/dl/latest/kind-linux-amd64
chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind
```

macOS:

```bash
brew install kind
```

Windows:

```powershell
winget install Kubernetes.kind      # or: choco install kind -y
```

### Installing the argocd CLI (optional)

Linux:

```bash
curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x argocd && sudo mv argocd /usr/local/bin/argocd
```

macOS:

```bash
brew install argocd
```

Windows - download `argocd-windows-amd64.exe` from the
[latest release](https://github.com/argoproj/argo-cd/releases/latest) and put it on your `PATH`.

### Shell notes

**Everything below is bash.** On Linux and macOS it runs as written. On Windows the simplest path
is Git Bash; in PowerShell three things differ:

| | bash | PowerShell |
|---|---|---|
| line continuation | `\` | backtick `` ` `` |
| variable assignment | `OWNERS='...'` | `$OWNERS = "..."` |
| base64 decode | `base64 -d` | no `base64` at all - see below |

Also on Windows: `winget` may install `kind.exe` without putting it on `PATH`. Open a new shell,
or add `%LOCALAPPDATA%\Microsoft\WinGet\Links` yourself.

## Manifests

Two files, differing in exactly one line:

| File | `metadata.name` |
|---|---|
| `appset-demo.yaml` | `demo-old` |
| `appset-demo-new.yaml` | `demo-new` |

Both generate the same two Applications, `demo-one` and `demo-two`, from the public
[`argocd-example-apps`](https://github.com/argoproj/argocd-example-apps) guestbook chart.

## Setup

```bash
kind create cluster --name argolab --wait 180s
kubectl config current-context                   # expect kind-argolab

kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd wait --for=condition=available --timeout=300s deployment --all
kubectl get crd applicationsets.argoproj.io      # must exist, or nothing below works
```

`--server-side` is required, not optional - plain `kubectl apply` fails on the ApplicationSet CRD
because client-side apply copies the whole object into the `last-applied-configuration` annotation,
and the CRD exceeds the 256 KB annotation limit.

Record the versions you ran against:

```bash
kubectl -n argocd get deploy argocd-server \
  -o jsonpath="{.spec.template.spec.containers[0].image}"
kubectl get nodes -o jsonpath="{.items[0].status.nodeInfo.kubeletVersion}"
```

## Argo CD UI (optional, but the demo is more obvious with it)

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

Then in a second shell - username is `admin`, the password is generated:

```bash
argocd admin initial-password -n argocd
argocd login localhost:8080 --username admin --insecure
```

If `argocd admin initial-password` is unavailable, read the secret directly.

Linux, macOS, Git Bash:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

On older macOS the BSD `base64` wants `-D` instead of `-d`.

PowerShell (`base64` does not exist there):

```powershell
[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String((kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}")))
```

## Run

```bash
# baseline
kubectl apply -f appset-demo.yaml
kubectl -n argocd wait --for=jsonpath="{.status.health.status}"=Healthy \
  application/demo-one application/demo-two --timeout=300s

OWNERS='NAME:.metadata.name,OWNER:.metadata.ownerReferences[0].name,SYNC:.status.sync.status'
kubectl get application -n argocd -o custom-columns="$OWNERS"
kubectl get pods -n demo-one -o custom-columns='POD:.metadata.name,START:.status.startTime'

# the wrong way - cascades into the workloads
kubectl delete applicationset demo-old -n argocd
kubectl get application -n argocd
kubectl get deploy -A | grep demo-

# rebuild, then the right way - Applications survive, ownerless
kubectl apply -f appset-demo.yaml
kubectl -n argocd wait --for=jsonpath="{.status.health.status}"=Healthy \
  application/demo-one application/demo-two --timeout=300s
kubectl delete applicationset demo-old -n argocd --cascade=orphan
kubectl get application -n argocd -o custom-columns="$OWNERS"

# the renamed appset adopts them instead of recreating
kubectl apply -f appset-demo-new.yaml
kubectl get application -n argocd -o custom-columns="$OWNERS"
kubectl get pods -n demo-one -o custom-columns='POD:.metadata.name,START:.status.startTime'
```

The pod name and start time are the point: identical before and after the rename.

### Finalizer A/B

Proves the finalizer is what turns "delete the Application" into "delete the workloads". Orphan
first so the controller does not recreate anything:

```bash
kubectl delete applicationset demo-new -n argocd --cascade=orphan
kubectl patch application demo-one -n argocd --type=merge -p "{\"metadata\":{\"finalizers\":null}}"

kubectl delete application demo-one -n argocd   # no finalizer
kubectl get deploy -n demo-one                  # still running

kubectl delete application demo-two -n argocd   # finalizer present
kubectl get deploy -n demo-two                  # gone
```

## Troubleshooting

No Applications appear after applying the appset:

```bash
kubectl -n argocd describe applicationset demo-old | tail -30
kubectl -n argocd logs deploy/argocd-applicationset-controller --tail=50
```

The usual causes are a missing `applicationsets.argoproj.io` CRD (see `--server-side` above) or a
templating mismatch - these manifests set `goTemplate: true` explicitly, which `{{.name}}` requires.

## Recording the cast (WSL Ubuntu)

The post embeds an asciinema recording of the naive delete. Tooling is in
`~/.local/bin` inside the Ubuntu distro: `asciinema` 3.2.1, `kubectl` v1.36.4, `kind` v0.32.0.

**One prerequisite that needs the GUI:** Docker Desktop → Settings → Resources → WSL Integration →
enable **Ubuntu** → Apply & Restart. Without it `docker` does not work inside Ubuntu and `kind`
cannot create a cluster there.

Then, inside Ubuntu, do the setup **before** starting the recorder - nobody wants to watch an
Argo CD install:

```bash
kind create cluster --name argolab --wait 180s
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl -n argocd wait --for=condition=available --timeout=300s deployment --all
kubectl apply -f /mnt/c/projects/hradecheck-com/lab/argocd-applicationset-rename/appset-demo.yaml
kubectl -n argocd wait --for=jsonpath="{.status.health.status}"=Healthy \
  application/demo-one application/demo-two --timeout=300s
```

Record only the interesting part:

```bash
asciinema rec -f asciicast-v2 --window-size 100x24 -i 2 \
  -t "Deleting an Argo CD ApplicationSet" \
  /mnt/c/projects/hradecheck-com/static/casts/appset-delete.cast
```

`-f asciicast-v2` matters: asciinema 3 defaults to asciicast v3, and v2 is what the bundled player
reads most reliably. `-i 2` collapses idle gaps longer than two seconds. `--window-size 100x24`
keeps the cast narrow enough to embed without horizontal scroll.

Inside the recording, six commands tell the whole story - before, the delete, after:

```bash
kubectl get application -n argocd
kubectl get deploy -A | grep demo-
kubectl delete applicationset demo-old -n argocd
kubectl get application -n argocd
kubectl get deploy -A | grep demo-
kubectl get ns | grep demo-
```

Skip `kubectl get application -w`: the cascade finishes in a couple of seconds, so by the time the
watch starts there is nothing left to watch.

`exit` ends the recording. The post embeds it with:

```markdown
{{< asciinema src="casts/appset-delete.cast" caption="One delete, and the environment goes with it" >}}
```

The shortcode errors at build time if the cast file is missing, so nothing ships half-wired.

## Teardown

```bash
kind delete cluster --name argolab
```
