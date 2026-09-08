# Source evidence, 2026-09-06

Scope: audit findings F13, F14, F15 and F17. Official Microsoft Learn search was used to discover relevant documentation, followed by full-page fetch and reading. The following table records the selected pages and reviewed sections. `questions.js` records the URL, date, status and individual scope note for every Q54-Q90; `AB620.md` reproduces those notes in English and German. This is documentation review, not live-tenant testing or verification of all 90 answers.

## Evidence table

| Questions | Microsoft Learn page (searched and fetched) | Reviewed evidence / limitation |
| --- | --- | --- |
| Q54 | [AB-620 study guide](https://learn.microsoft.com/credentials/certifications/resources/study-guides/ab-620) | About the exam: commonly used previews may appear; replaces the unrelated design-canvas reference. |
| Q55, Q56, Q62, Q78, Q80 | [Integration strategies](https://learn.microsoft.com/microsoft-copilot-studio/guidance/integrations) | Prebuilt/custom connectors, deterministic agent flows, inputs/outputs, secrets, read versus write operations. Q80 typed schema/error vocabulary is only partially supported by this page. |
| Q57, Q58 | [Secure projects](https://learn.microsoft.com/microsoft-copilot-studio/guidance/sec-gov-phase3) | Restricted access, end-user delegation, data policies and gated dev/test/prod releases. Q57 remains partial rather than a universal delegated-auth rule. |
| Q59 | [Application card](https://learn.microsoft.com/microsoft-copilot-studio/system-service-card-copilot-studio) | Safety mitigations and best practices: trusted grounding, human oversight and approval gates for high-impact actions. |
| Q60, Q70, Q72, Q84 | [A2A](https://learn.microsoft.com/microsoft-copilot-studio/add-agent-agent-to-agent) | Agent communication versus HTTP/MCP, trust boundaries, observability and traceability. Q60 matching labels are shorthand; Q84 specific timeout procedure comes from Lab 12. |
| Q61 | [Error handling](https://learn.microsoft.com/power-automate/guidance/coding-guidelines/error-handling) | Run after, retry policy, logs and notifications. User-facing fallback design remains partial/scenario-specific. |
| Q63, Q79 | [Modify flow for an agent](https://learn.microsoft.com/microsoft-copilot-studio/flow-modify-use-with-agent) | Synchronous Respond to the agent, asynchronous response off, response deadline; later processing may continue after the response. |
| Q64, Q65 | [Ask with Adaptive Cards](https://learn.microsoft.com/microsoft-copilot-studio/authoring-ask-with-adaptive-card) | Inputs, submit actions, unique submit payloads, host schema/action differences. |
| Q66, Q81 | [Azure AI Search RAG](https://learn.microsoft.com/azure/search/retrieval-augmented-generation-overview) | Incremental indexing keeps content fresh. Specific connector/index refresh and root cause still require validation. |
| Q67, Q82 | [RAG in Copilot Studio](https://learn.microsoft.com/microsoft-copilot-studio/guidance/retrieval-augmented-generation) | Azure AI Search semantic retrieval, custom instructions and grounding. Standard connection lacks delegated security trimming. No standard `conflict` token is defined; Q82 is partial. |
| Q68, Q69 | [Other agents overview](https://learn.microsoft.com/microsoft-copilot-studio/authoring-add-other-agents) | Independent teams, publishing and ALM; extra orchestration latency and governance. Q68 permission/domain choice remains a design judgment. |
| Q71, Q85 | [Existing MCP server](https://learn.microsoft.com/microsoft-copilot-studio/mcp-add-existing-server-to-agent) | Streamable transport, SSE unsupported after August 2025, authentication and connector data-policy enforcement. |
| Q73, Q87, Q88 | [Evaluator guidance](https://learn.microsoft.com/microsoft-365/copilot/employee-self-service/evaluations-run-tests) | Repeatable test sets, expected responses, refusal/RAI scenarios, regression after changes. Q73 metric naming and Q87 `boundary` taxonomy remain partial. |
| Q74 | [Agent metrics reference](https://learn.microsoft.com/microsoft-copilot-studio/guidance/agent-business-value-metrics-reference) | Distinct groundedness and topic-match definitions. The proposed diagnostic combination is an inference, not a proven cause. |
| Q75, Q89 | [Environment variables](https://learn.microsoft.com/power-apps/maker/data-platform/environmentvariables) | Configuration separated from consumers; values supplied for target environments. |
| Q76 | [Deployment connection references](https://learn.microsoft.com/power-platform/alm/conn-ref-env-variables-build-tools) | Connection references and environment-specific configuration populated during solution deployment. |
| Q77 | [User authentication](https://learn.microsoft.com/microsoft-copilot-studio/configuration-end-user-authentication) | Teams identity, Entra ID and sharing. Expanded scopes can still prompt for authentication. |
| Q83 | [Telemetry data model](https://learn.microsoft.com/azure/azure-monitor/app/data-model-complete) | Shared operation identifiers correlate distributed telemetry. Lab 14 custom correlationId/conversationId fields are not universal native fields. |
| Q86 | [Computer Use FAQ](https://learn.microsoft.com/microsoft-copilot-studio/faqs-computer-use) | Isolation, least privilege and validation. Human supervision is probabilistic and is not a fail-safe for custom confirmation/stop rules. Partial status is intentional. |
| Q90 | [Compensating transactions](https://learn.microsoft.com/azure/architecture/patterns/compensating-transaction) | External side effects may require application-specific compensation or manual intervention. Specific release/containment procedure comes from courseware. |

Q54-Q90: 22 supported, 15 partial. Q1-Q53: not individually reviewed in this phase; topic-level references retained. Review status applies to the explanation as well as the selected answer. The presence of a valid official URL alone is never enough for confirmation.

## Courseware origins

Fetched and read the original lab Markdown at commit `941360e11dfa677914a00281a8255404e8c848e0`. These are the exact origin assignments; related labs stay independent and retain their prior associations.

| Question | Origin lab | Evidence in original lab |
| --- | --- | --- |
| Q79 | 4 | Callable flow trigger/response and structured outputs; Learn supplies the synchronous constraint. |
| Q80 | 4 | Steps 2, 7-9: typed inputs, explicit review/error outcomes and outputs. |
| Q81 | 8 (was 7) | Step 4: freshness, owner and acceptable refresh delay. |
| Q82 | 13 (was 8) | Step 7: fixture expectations include `conflict`; course-specific token. |
| Q83 | 14 (was 12) | Steps 2 and 6: custom business correlation joins native telemetry by conversation ID. |
| Q84 | 12 (was 11) | Steps 7-8 and challenge: history sharing, authentication, boundaries, timeout and incident ownership. |
| Q85 | 10 | Steps 2-3: authentication and review of discovered tools/resources. |
| Q86 | 10 | Steps 5-7 and challenge: isolated mock environment, stopping, confirmation and cancellation. |
| Q87 | 15 | Step 1: course taxonomy `core`, `robustness`, `architecture`, `boundary`. |
| Q88 | 16 (was 15) | Steps 5-7: hypothesis, targeted change, regression subset, before/after comparison. |
| Q89 | 18 (was 17) | Steps 1-4: environment configuration, typed variables, replacement of hardcoded values and connection references. |
| Q90 | 20 (was 19) | Steps 5-8: incident timeline, containment, runbook recovery and verification. |

Each question's `originalSource` links to the complete pinned file. Full original text is not copied into this repository.

## Upstream files

The GitHub recursive tree endpoint was queried for the specified commit. All 38 `labs/` blob paths are recorded in `scripts/upstream-files.json`, independent of the application data. Resource links now point to eight actual files rather than a directory: ADR Markdown, Adaptive Card JSON, ticket OpenAPI YAML, Application Insights KQL, platform test CSV, separate traceability/design CSV, deployment checklist, and Foundry evidence JSON. Lab 13/14/15/16/20 originals explicitly identify the relevant supporting files.

To inspect the inventory again without modifying it:

```bash
gh api 'repos/tertiarycourses/C1760-AB-620-Microsoft-Certified-AI-Agent-Builder-Associate/git/trees/941360e11dfa677914a00281a8255404e8c848e0?recursive=1' --jq '.tree[] | select(.type == "blob" and (.path | startswith("labs/"))) | .path'
```

## Limits

Separate network checks on 2026-09-06 returned HTTP 200 for all 20 distinct reviewed Learn URLs and all 74 distinct content links (including the 20 labs and eight resources). Learn locale redirects and community post redirects were followed and reported. These results show reachability at that time only, not factual validation or permanent availability.

No live Copilot Studio environment, real exam, full 90-answer fact audit, legal-compliance review or broad browser certification was performed. Third-party original-source attribution is retained, not a fresh authentication of the third party's publication history. As of 2026-09-06, existing insight claims have not been individually re-audited: the inherited confirmed/partially-confirmed labels lacked per-claim substantiation in this audit and have been replaced with explicit dated unreviewed limitations in canonical data, both UI languages and generated Markdown. Their reference URLs do not substantiate every claim. Microsoft documentation now distinguishes different agent harnesses; feature support and previews must be checked for the target environment. Reachability checks are a separate opt-in script and do not validate page meaning.
