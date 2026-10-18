// Pure permission rules (no database), shared by the server and tested on their own.
// Features whose checklist offers fewer switches than the screens need: the missing action follows the one that is offered
// (Settings and Email templates offer View + Edit only, so Edit also covers adding and deleting; Checklist templates offer
// Create + Delete only, so Create also covers opening and editing them).
export const IMPLIED_BY = {
    settings: { create: 'edit', delete: 'edit' },
    email_templates: { create: 'edit', delete: 'edit' },
    checklist_templates: { view: 'create', view_own: 'create', edit: 'create' },
}
