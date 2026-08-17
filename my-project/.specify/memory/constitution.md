<!--
Sync Impact Report
==================
Version change: (unversioned template) → 1.0.0
Bump rationale: MAJOR — initial ratification. All placeholder tokens replaced
with concrete governance; no prior version existed to be backward compatible with.

Modified principles:
  [PRINCIPLE_1_NAME] → I. Code Quality Is Reviewable Quality
  [PRINCIPLE_2_NAME] → II. Testing Standards (NON-NEGOTIABLE)
  [PRINCIPLE_3_NAME] → III. User Experience Consistency
  [PRINCIPLE_4_NAME] → IV. Performance Requirements Are Budgets
  [PRINCIPLE_5_NAME] → (removed — user requested four focus areas)

Added sections:
  Additional Constraints (was [SECTION_2_NAME])
  Development Workflow & Quality Gates (was [SECTION_3_NAME])

Removed sections:
  Fifth principle slot — the requested scope names exactly four areas.

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gates align
  ✅ .specify/templates/spec-template.md — no mandatory sections added or removed
  ✅ .specify/templates/tasks-template.md — task categories cover testing and performance
  ⚠ README.md — no constitution reference yet; add one if this governance is adopted repo-wide

Deferred items:
  TODO(RATIFICATION_DATE): original adoption date not recorded in repo history;
  set to the date this constitution is approved.
-->

# AD Secure Lab Constitution

## Core Principles

### I. Code Quality Is Reviewable Quality

Every script MUST be idempotent: re-running it against an already-provisioned host
MUST converge to the same state without error and without duplicating objects.
Provisioning steps MUST fail loudly — no silent `-ErrorAction SilentlyContinue` to
paper over a failed operation. Configuration values (domain name, network ranges,
OU paths, account data) MUST live in data files or parameters, never hardcoded in
more than one place. Each script MUST carry a header comment stating its purpose,
its preconditions, and what it leaves behind.

Rationale: this repo is read as teaching material as much as it is executed. Code
that cannot be re-run or re-read has failed at its primary job.

### II. Testing Standards (NON-NEGOTIABLE)

Every hardening measure MUST have a corresponding verification that asserts the
end state on the provisioned host, not merely that the script exited zero. A
change to provisioning MUST be validated by a full `vagrant destroy -f && vagrant up`
from a clean state before merge — partial `vagrant provision` runs are not
sufficient evidence. Any bug fixed MUST first be reproduced by a failing check,
then fixed. Verification output MUST name the specific control it asserts.

Rationale: hardening that is not verified is hardening that is assumed. The gap
between "the GPO was applied" and "the attack vector is closed" is exactly where
security labs mislead their users.

### III. User Experience Consistency

The documented entry point MUST remain a single command from a clean clone. All
user-facing output — console messages, documentation, commit messages — MUST be in
French, matching the existing corpus. Every hardening decision MUST be documented
with its security justification in `docs/`, not only its mechanism. Terminology
MUST be stable across code, docs, and diagrams: a host, OU, or group named one way
in one artifact MUST NOT be named differently in another.

Rationale: an inconsistent lab teaches inconsistent habits, and a reader who must
reconcile three names for one object is spending attention on the wrong problem.

### IV. Performance Requirements Are Budgets

A full provision from clean state MUST complete within 45 minutes on the documented
minimum hardware (8 GB RAM, both VMs in parallel), excluding first-time base image
download. Any change that pushes past that budget MUST be justified in the pull
request or reverted. Scripts MUST wait on explicit readiness conditions — service
state, replication, domain availability — rather than fixed `Start-Sleep` delays.
Expected reboots MUST be declared and orchestrated, never left for the operator to
discover.

Rationale: a budget that is never stated is never defended. Fixed sleeps are both
slower than necessary and less reliable than a real readiness check.

## Additional Constraints

Lab credentials are deliberately weak and MUST remain confined to the isolated
host-only network; they MUST NOT be reused anywhere else, and the README security
note MUST stay in place. No real, personal, or production data enters `data/`.
The lab targets the platform versions named in the README; changing a target
version is a documentation change as much as a code change.

## Development Workflow & Quality Gates

Changes land through pull requests on feature branches. Before merge, a change
MUST: pass a clean-state provision (Principle II), leave affected `docs/` updated
in the same change, and state its performance impact if it touches provisioning
order or waits. A reviewer MUST be able to trace every hardening control from the
script that applies it to the document that justifies it. Complexity that cannot
be justified in review MUST be removed rather than annotated.

## Governance

This constitution supersedes ad-hoc practice. Where a habit and this document
disagree, this document wins until it is amended.

Amendments require a pull request that states the change, its rationale, and its
migration impact on existing scripts and docs. Versioning follows semantic
versioning: MAJOR for removing or redefining a principle in a backward-incompatible
way, MINOR for adding a principle or materially expanding guidance, PATCH for
clarifications and wording. Every amendment updates the version line below and
records the change in the Sync Impact Report at the top of this file.

Compliance is reviewed at pull request time; reviewers MUST verify the quality
gates above. Runtime development guidance for coding agents lives in
`.github/copilot-instructions.md` and MUST be kept consistent with these principles.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): set to approval date | **Last Amended**: 2026-08-17
