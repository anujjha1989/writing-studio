# Learning-first design pass

Baseline: 1cb012d, merged Training Studio and gold icon. User approved the Apple Design review on 2026-10-20. Delivery checkpoint: implemented, tested PR for Claude; do not merge or deploy automatically.

Required: Learn/Practice/Library/Books navigation, focused Continue Learning home, progressive lesson steps, guided workbook with scene fields and act pickers, comfortable touch targets and restrained floating chrome with opaque fallback. Preserve cream/green identity, existing data/drafts, paid-coach approval and all existing writing routes.

Completed: learning-first tab bar/home; collapsible course catalogue; four-step lessons; six-stage workbook; structured scenes with legacy-note preservation, act pickers, reorder and undo removal; quieter secondary controls; 44px training targets; floating navigation with opaque/reduced-transparency/high-contrast fallback. Existing export/coaching controls retained.

Validation complete: full npm test passes, including structured and legacy scene parsing, structured server export, store recovery, installer and paid-coach approval tests. No paid API calls. Browser checked at 402x874, 320x700, 874x402 and 1280x900: lesson steps, saved practice after reload, scene fields/removal/Undo and reload, workbook review, reference library, secondary navigation, light/dark appearance, no horizontal document overflow and no captured console errors. Physical iPhone keyboard and assistive technology were not tested. Original legacy notes are covered by automated tests, not a production-data browser migration.

Delivery: implementation ready for PR review. No production deployment, merge or native installation performed. Web source is served directly by the existing Node server; the iOS wrapper consumes that same web app, so there is no second UI build path.
