---
title: "Helm charts are code. Test them like it."
date: 2026-03-14
draft: false
tags: ["helm", "kubernetes", "testing", "devops"]
summary: "The importance of unit testing your helm charts"
---

*"Do you test your code?"* You'd laugh at anyone who said no.\
*"Do you test your Helm charts?"* Most people go quiet.

It's the same discipline — you write code, you package it, you ship it. Yet unit testing somehow stops at the edge of the
`templates/` directory.

## Why it matters

Here's a simple Python function that builds a database connection config, enforcing SSL in production:

```python
def db_config(env):
    cfg = {"host": "db.internal", "port": 5432}
    if env == "production":
        cfg["sslmode"] = "require"
    return cfg
```

A unit test verifies that production connections always use SSL:

```python
def test_production_requires_ssl():
    config = db_config("production")
    assert config["sslmode"] == "require"
```

Now someone standardizes environment names across the codebase — `"production"` becomes `"prod"` — but forgets to update
this function.\
SSL silently disappears from every production database connection. Except it doesn't make it far because the test fails
immediately.

Bug caught, disaster avoided.

Now look at a Helm deployment template with the same pattern — a conditional liveness probe:

```yaml
{{- if .Values.probes.enabled }}
livenessProbe:
  httpGet:
    path: {{ .Values.probes.path }}
{{- end }}
```

Someone refactors `values.yaml` and moves `probes.enabled` under a new `health` key.\
The condition quietly evaluates to `nil`. The probe vanishes from the rendered manifest.\
No test. No failure. No warning.\
Straight to production, where Kubernetes no longer restarts your unresponsive pods.

The fix is the same one you'd reach for in any other codebase: a unit test. And with `helm-unittest`, writing one looks surprisingly familiar.

If you wouldn't merge a Python PR that breaks a unit test, why would your CI pipeline let a broken Helm chart through?

## helm-unittest

[helm-unittest](https://github.com/helm-unittest/helm-unittest) is a Helm plugin that lets you write tests in YAML.
No cluster needed, no rendered manifests piped through `grep` — just declarative assertions against your templates.

Install it:

```bash
helm plugin install https://github.com/helm-unittest/helm-unittest
```

Tests live inside your chart under `tests/`, which helm-unittest discovers automatically. Here's what a minimal chart structure looks like:

```text
my-app/
├── Chart.yaml
├── values.yaml
├── templates/
│   └── deployment.yaml
└── tests/
    └── deployment_test.yaml
```

### Writing your first test

Let's pick up right where we left off. Here's our `templates/deployment.yaml` with the conditional liveness probe:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  template:
    spec:
      containers:
        - name: app
          image: {{ .Values.image }}
          ports:
            - containerPort: {{ .Values.port }}
          {{- if .Values.probes.enabled }}
          livenessProbe:
            httpGet:
              path: {{ .Values.probes.path }}
              port: {{ .Values.port }}
          {{- end }}
```

And `values.yaml`:

```yaml
image: my-app:latest
port: 8080
probes:
  enabled: true
  path: /healthz
```

Now the test. Create `tests/deployment_test.yaml`:

```yaml
suite: deployment tests
templates:
  - templates/deployment.yaml
tests:
  - it: should have a liveness probe when probes are enabled
    set:
      probes.enabled: true
      probes.path: /healthz
    asserts:
      - equal:
          path: spec.template.spec.containers[0].livenessProbe.httpGet.path
          value: /healthz

  - it: should not have a liveness probe when probes are disabled
    set:
      probes.enabled: false
    asserts:
      - notExists:
          path: spec.template.spec.containers[0].livenessProbe
```

Both directions matter. One test asserts the probe exists, the other asserts it's absent.
It's the negative case that catches the silent-omission bug: if you only verify the probe appears,
you'll never know when it quietly disappears.

### Running the tests

```bash
helm unittest my-app
```

```text
### Chart [ my-app ] my-app

 PASS  deployment tests
       ✓ should have a liveness probe when probes are enabled
       ✓ should not have a liveness probe when probes are disabled

Charts:  1 passed, 1 total
Tests:   2 passed, 2 total
```

### Catching the bug

Remember the refactor from earlier — someone moves `probes.enabled` under a `health` key in `values.yaml` but forgets to
update the template?

Run the tests again:

```text
### Chart [ my-app ] my-app

 FAIL  deployment tests
       ✕ should have a liveness probe when probes are enabled

       - asserts[0] `equal` fail
         Template: my-app/templates/deployment.yaml
         DocumentIndex: 0
         Path: spec.template.spec.containers[0].livenessProbe.httpGet.path
         Expected:
             /healthz
         Actual:
             null

Charts:  1 failed, 1 total
Tests:   1 failed, 1 passed, 2 total
```

The probe silently vanished, and the assertion told you exactly where it broke.\
That's the same safety net you've had in Python all along - just for your Helm charts.

### One thing helm-unittest won't do

It's worth being honest: `helm-unittest` renders your templates and asserts against the output, but it doesn't validate
that output against the Kubernetes API schema, and it won't catch runtime failures. A probe with a correctly rendered
path but a missing `port` field will pass every assertion you write and still fail to apply to a cluster.

For that layer, pair it with [kubeconform](https://github.com/yannh/kubeconform). Where `helm-unittest` checks that
your chart generates what you intended, `kubeconform` checks that what you intended is actually valid Kubernetes.
The two tools cover different failure modes and are better together.

The combination is straightforward — pipe `helm template` output directly into `kubeconform`:

```bash
helm template my-app | kubeconform -strict -summary
```

`-strict` rejects any fields not in the schema (catches typos and deprecated keys). `-summary` keeps the output clean.
In CI, add it as a second step alongside your `helm unittest` run:

```yaml
- name: Validate schema
  run: helm template my-app | kubeconform -strict -summary
```

Think of the two tools as complementary layers: `helm-unittest` is your logic layer, `kubeconform` is your
correctness layer.

## Start small

You don't need to test every field in every template. Start with the things most likely to break silently:

- **Conditionals** — anything behind an `{{- if }}` block
- **Defaults and fallbacks** — verify behavior when values are omitted entirely
- **Resource limits** — easy to accidentally drop and hard to notice until things go sideways
- **Ingress rules** — toggled on/off per environment, often misconfigured
- **RBAC rules** — permissions that only appear under certain values
- **Name and label templates** — shared helpers that everything depends on

One test file, a handful of assertions. You'll be surprised how quickly it pays off.

## Add it to CI

The real payoff comes when you wire it into your pipeline. A broken chart stops being a production incident.
It becomes a failed build — which is exactly where you want to catch it.

Here's a complete GitHub Actions workflow:

```yaml
name: Helm chart tests

on:
  pull_request:
    paths:
      - 'my-app/**'

jobs:
  unittest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v4

      - name: Install helm-unittest
        run: helm plugin install https://github.com/helm-unittest/helm-unittest --version v0.7.1

      - name: Run chart tests
        run: helm unittest my-app
```

A few things are worth noting:

- **`paths` filter** keeps the job from running on unrelated changes. If nothing under `my-app/` changed, the workflow doesn't trigger.
- **Triggered on pull requests**, not just merges. That's the point — you want feedback before the code lands, not after.
- **No cluster, no credentials, no setup beyond Helm itself.** The tests render templates in memory and assert against the output. It's fast.

The last step is to make the job a required status check in your branch protection rules. Once you do that, a PR with a broken chart simply cannot be merged. Not "will probably be caught" — cannot. That's the same guarantee your application tests already give you.

You wouldn't merge a Python PR that breaks a unit test. Stop giving your Helm charts a free pass.
