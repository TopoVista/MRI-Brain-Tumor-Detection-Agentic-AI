# Architecture

## Request flow

1. MRI image upload from the Next.js UI
2. FastAPI route validates image payload
3. LangGraph orchestrator stores the scan
4. Preprocessing agent normalizes the image and extracts MRI features
5. Algorithm agents run independently:
   - Proposed CNN agent
   - ResNet-50 agent
   - VGG16 agent
   - Inception V3 agent
6. Orchestration agent aggregates model votes into one final class
7. Retrieval agent queries ChromaDB for supporting medical context
8. Report agent drafts a grounded report
9. Verification agent checks evidence coverage, agreement, and safety wording
10. SQLite persists the final case summary

## Safety model

- AI-assisted only, no autonomous diagnosis
- Explicit uncertainty handling
- Citation grounding
- Verifier checks for missing evidence and weak safety language
- Confidence threshold support for escalation
