/**
 * Ready-made email designs for every Perfex template slug, in French and English.
 * D(slug, who, tone, link, rows, extras, en, fr)
 *   who   c = contact (first + last name), cf = contact first name, s = staff first name, st = {staff_name}, n = nobody
 *   tone  info | success | warn | danger (accent colour)
 *   link  merge field holding the button URL ('' for none)
 *   rows  [[English label, French label, merge field], ...] shown as a details table
 *   extras { quote: field shown as a quoted block, code: field shown as a big code }
 *   en/fr [subject, title, body, button label]  (body paragraphs are separated by \n)
 */
export const CATALOG = {}
const D = (slug, who, tone, link, rows, extras, en, fr) => { CATALOG[slug] = { who, tone, link, rows, extras: extras || {}, en, fr } }

/* ---------- Invoices ---------- */
D('invoice-send-to-client', 'c', 'info', 'invoice_link', [['Invoice', 'Facture', 'invoice_number'], ['Status', 'Statut', 'invoice_status']], null,
  ['Invoice {invoice_number} from {companyname}', 'Your invoice is ready', 'Thank you for your trust. Invoice {invoice_number} has been issued and is available online.\nYou can view it, download it and follow its payment status at any time.', 'View invoice'],
  ['Facture {invoice_number} de {companyname}', 'Votre facture est disponible', 'Merci pour votre confiance. La facture {invoice_number} a été émise et reste consultable en ligne.\nVous pouvez la consulter, la télécharger et suivre son état de paiement à tout moment.', 'Voir la facture'])
D('invoice-already-send', 'c', 'info', 'invoice_link', [['Invoice', 'Facture', 'invoice_number']], null,
  ['Invoice {invoice_number}', 'Here is your invoice again', 'As requested, here is the link to invoice {invoice_number}.', 'View invoice'],
  ['Facture {invoice_number}', 'Voici à nouveau votre facture', 'Comme demandé, voici le lien vers la facture {invoice_number}.', 'Voir la facture'])
D('invoice-due-notice', 'c', 'warn', 'invoice_link', [['Invoice', 'Facture', 'invoice_number'], ['Due date', "Date d'échéance", 'invoice_duedate']], null,
  ['Invoice {invoice_number} is due soon', 'Your invoice is due soon', 'This is a friendly reminder that invoice {invoice_number} will be due on {invoice_duedate}.\nIf you have already paid it, please ignore this message.', 'View and pay'],
  ['Votre facture {invoice_number} arrive à échéance', 'Votre facture arrive à échéance', "Petit rappel : la facture {invoice_number} arrive à échéance le {invoice_duedate}.\nSi vous l'avez déjà réglée, merci de ne pas tenir compte de ce message.", 'Consulter et payer'])
D('invoice-overdue-notice', 'c', 'danger', 'invoice_link', [['Invoice', 'Facture', 'invoice_number'], ['Due date', "Date d'échéance", 'invoice_duedate']], null,
  ['Overdue invoice {invoice_number}', 'Your invoice is overdue', 'Invoice {invoice_number} was due on {invoice_duedate} and we have not received the payment yet.\nPlease settle it as soon as possible, or contact us if there is a problem.', 'View invoice'],
  ['Avis de retard – facture {invoice_number}', 'Votre facture est en retard', "La facture {invoice_number} était due le {invoice_duedate} et nous n'avons pas encore reçu le règlement.\nMerci de la régler dès que possible, ou de nous contacter en cas de difficulté.", 'Voir la facture'])
D('invoice-payment-recorded', 'c', 'success', 'invoice_link', [['Invoice', 'Facture', 'invoice_number'], ['Amount received', 'Montant reçu', 'payment_total'], ['Date', 'Date', 'payment_date']], null,
  ['Payment received for invoice {invoice_number}', 'Payment received, thank you!', 'We have recorded your payment for invoice {invoice_number}. Here are the details:', 'View invoice'],
  ['Paiement reçu pour la facture {invoice_number}', 'Paiement reçu, merci !', 'Nous avons bien enregistré votre paiement pour la facture {invoice_number}. Voici le détail :', 'Voir la facture'])
D('invoice-payment-recorded-to-staff', 's', 'success', 'invoice_link', [['Invoice', 'Facture', 'invoice_number']], null,
  ['New payment on invoice {invoice_number}', 'A payment was recorded', 'A new payment has been recorded on invoice {invoice_number}.', 'Open invoice'],
  ['Nouveau paiement sur la facture {invoice_number}', 'Un paiement a été enregistré', 'Un nouveau paiement a été enregistré sur la facture {invoice_number}.', 'Ouvrir la facture'])
D('invoices-batch-payments', 'c', 'success', '', [], { quote: 'batch_payments_list' },
  ['We received your payments', 'Payments received, thank you!', 'We have received the following payments:', ''],
  ['Nous avons reçu vos paiements', 'Paiements reçus, merci !', 'Nous avons bien reçu les paiements suivants :', ''])

/* ---------- Estimates ---------- */
D('estimate-send-to-client', 'c', 'info', 'estimate_link', [['Estimate', 'Devis', 'estimate_number'], ['Company', 'Société', 'client_company']], null,
  ['Estimate {estimate_number} – {client_company}', 'Your estimate is ready', 'Please find our estimate {estimate_number}. You can review it online and accept it in one click.\nDo not hesitate to contact us if you need any adjustment.', 'View estimate'],
  ['Devis {estimate_number} – {client_company}', 'Votre devis est prêt', "Veuillez trouver notre devis {estimate_number}. Vous pouvez le consulter en ligne et l'accepter en un clic.\nN'hésitez pas à nous contacter pour tout ajustement.", 'Voir le devis'])
D('estimate-already-send', 'c', 'info', 'estimate_link', [['Estimate', 'Devis', 'estimate_number']], null,
  ['Estimate {estimate_number}', 'Here is your estimate again', 'As requested, here is the link to estimate {estimate_number}.', 'View estimate'],
  ['Devis {estimate_number}', 'Voici à nouveau votre devis', 'Comme demandé, voici le lien vers le devis {estimate_number}.', 'Voir le devis'])
D('estimate-declined-to-staff', 's', 'danger', 'estimate_link', [['Client', 'Client', 'client_company'], ['Estimate', 'Devis', 'estimate_number']], null,
  ['Estimate {estimate_number} declined', 'An estimate was declined', '{client_company} has declined estimate {estimate_number}.', 'Open estimate'],
  ['Devis {estimate_number} refusé', 'Un devis a été refusé', '{client_company} a refusé le devis {estimate_number}.', 'Ouvrir le devis'])
D('estimate-accepted-to-staff', 's', 'success', 'estimate_link', [['Client', 'Client', 'client_company'], ['Estimate', 'Devis', 'estimate_number']], null,
  ['Estimate {estimate_number} accepted', 'An estimate was accepted', 'Good news: {client_company} has accepted estimate {estimate_number}.', 'Open estimate'],
  ['Devis {estimate_number} accepté', 'Un devis a été accepté', 'Bonne nouvelle : {client_company} a accepté le devis {estimate_number}.', 'Ouvrir le devis'])
D('estimate-thank-you-to-customer', 'c', 'success', '', [], null,
  ['Thank you for accepting our estimate', 'Thank you for your trust', 'Thank you for accepting our estimate. We will get started right away and keep you informed of every step.', ''],
  ["Merci d'avoir accepté notre devis", 'Merci pour votre confiance', "Merci d'avoir accepté notre devis. Nous démarrons sans attendre et vous tiendrons informé de chaque étape.", ''])
D('estimate-expiry-reminder', 'c', 'warn', 'estimate_link', [['Estimate', 'Devis', 'estimate_number'], ['Valid until', "Valable jusqu'au", 'estimate_expirydate']], null,
  ['Estimate {estimate_number} expires soon', 'Your estimate expires soon', 'Estimate {estimate_number} is valid until {estimate_expirydate}. Review and accept it before then to keep the quoted conditions.', 'View estimate'],
  ['Le devis {estimate_number} expire bientôt', 'Votre devis expire bientôt', "Le devis {estimate_number} est valable jusqu'au {estimate_expirydate}. Consultez-le et acceptez-le avant cette date pour conserver les conditions proposées.", 'Voir le devis'])
D('estimate-request-submitted-to-staff', 's', 'info', 'estimate_request_link', [['Form', 'Formulaire', 'estimate_request_form_name'], ['Email', 'E-mail', 'estimate_request_email']], { quote: 'estimate_request_submitted_data' },
  ['New estimate request', 'New estimate request', 'A new estimate request was submitted.', 'Open request'],
  ['Nouvelle demande de devis', 'Nouvelle demande de devis', 'Une nouvelle demande de devis a été envoyée.', 'Ouvrir la demande'])
D('estimate-request-assigned', 's', 'info', 'estimate_request_link', [['Request', 'Demande', 'estimate_request_id']], null,
  ['An estimate request is assigned to you', 'Estimate request assigned', 'An estimate request has been assigned to you.', 'Open request'],
  ['Une demande de devis vous est attribuée', 'Demande de devis attribuée', 'Une demande de devis vous a été attribuée.', 'Ouvrir la demande'])
D('estimate-request-received-to-user', 'n', 'info', '', [], null,
  ['We received your estimate request', 'Request received', 'Thank you. We received your estimate request and will get back to you shortly.', ''],
  ['Nous avons reçu votre demande de devis', 'Demande reçue', 'Merci. Nous avons bien reçu votre demande de devis et revenons vers vous très rapidement.', ''])

/* ---------- Proposals ---------- */
D('proposal-send-to-customer', 'n', 'info', 'proposal_link', [['Proposal', 'Proposition', 'proposal_number'], ['Subject', 'Objet', 'proposal_subject']], null,
  ['Proposal {proposal_number} – {proposal_subject}', 'A proposal for you', 'Hello {proposal_proposal_to},\nWe have prepared a proposal for "{proposal_subject}". You can read it online and let us know your decision.', 'View proposal'],
  ['Proposition {proposal_number} – {proposal_subject}', 'Une proposition pour vous', 'Bonjour {proposal_proposal_to},\nNous avons préparé une proposition pour « {proposal_subject} ». Vous pouvez la consulter en ligne et nous faire part de votre décision.', 'Voir la proposition'])
D('proposal-client-accepted', 's', 'success', 'proposal_link', [['Client', 'Client', 'proposal_proposal_to'], ['Proposal', 'Proposition', 'proposal_number'], ['Total', 'Total', 'proposal_total']], null,
  ['Proposal {proposal_number} accepted', 'A proposal was accepted', '{proposal_proposal_to} has accepted proposal "{proposal_subject}".', 'Open proposal'],
  ['Proposition {proposal_number} acceptée', 'Une proposition a été acceptée', '{proposal_proposal_to} a accepté la proposition « {proposal_subject} ».', 'Ouvrir la proposition'])
D('proposal-client-declined', 's', 'danger', 'proposal_link', [['Client', 'Client', 'proposal_proposal_to'], ['Proposal', 'Proposition', 'proposal_number']], null,
  ['Proposal {proposal_number} declined', 'A proposal was declined', '{proposal_proposal_to} has declined proposal "{proposal_subject}".', 'Open proposal'],
  ['Proposition {proposal_number} refusée', 'Une proposition a été refusée', '{proposal_proposal_to} a refusé la proposition « {proposal_subject} ».', 'Ouvrir la proposition'])
D('proposal-client-thank-you', 'n', 'success', '', [], null,
  ['Thank you for accepting our proposal', 'Thank you for your trust', 'Hello {proposal_proposal_to},\nThank you for accepting our proposal. We are excited to work with you and will contact you shortly with the next steps.', ''],
  ["Merci d'avoir accepté notre proposition", 'Merci pour votre confiance', 'Bonjour {proposal_proposal_to},\nMerci d\'avoir accepté notre proposition. Nous sommes ravis de travailler avec vous et vous contacterons très vite pour les prochaines étapes.', ''])
D('proposal-comment-to-client', 'n', 'info', 'proposal_link', [['Proposal', 'Proposition', 'proposal_number']], null,
  ['New comment on proposal {proposal_number}', 'New comment on your proposal', 'Hello {proposal_proposal_to},\nA new comment was added to proposal {proposal_number}.', 'View comment'],
  ['Nouveau commentaire sur la proposition {proposal_number}', 'Nouveau commentaire sur votre proposition', 'Bonjour {proposal_proposal_to},\nUn nouveau commentaire a été ajouté à la proposition {proposal_number}.', 'Voir le commentaire'])
D('proposal-comment-to-admin', 's', 'info', 'proposal_link', [['Proposal', 'Proposition', 'proposal_number'], ['Subject', 'Objet', 'proposal_subject']], null,
  ['New comment on proposal {proposal_number}', 'New comment on a proposal', 'A client commented on proposal "{proposal_subject}".', 'View comment'],
  ['Nouveau commentaire sur la proposition {proposal_number}', 'Nouveau commentaire sur une proposition', 'Un client a commenté la proposition « {proposal_subject} ».', 'Voir le commentaire'])
D('proposal-expiry-reminder', 'n', 'warn', 'proposal_link', [['Proposal', 'Proposition', 'proposal_number'], ['Open until', "Ouverte jusqu'au", 'proposal_open_till']], null,
  ['Proposal {proposal_number} expires soon', 'Your proposal expires soon', 'Hello {proposal_proposal_to},\nProposal {proposal_number} is open until {proposal_open_till}. Please review it before then.', 'View proposal'],
  ['La proposition {proposal_number} expire bientôt', 'Votre proposition expire bientôt', "Bonjour {proposal_proposal_to},\nLa proposition {proposal_number} est ouverte jusqu'au {proposal_open_till}. Merci de la consulter avant cette date.", 'Voir la proposition'])

/* ---------- Contracts ---------- */
D('send-contract', 'c', 'info', 'contract_link', [['Contract', 'Contrat', 'contract_subject']], null,
  ['Contract – {contract_subject}', 'A contract to review and sign', 'Please find the contract "{contract_subject}". You can read it online and sign it electronically.', 'Review contract'],
  ['Contrat – {contract_subject}', 'Un contrat à consulter et signer', 'Veuillez trouver le contrat « {contract_subject} ». Vous pouvez le lire en ligne et le signer électroniquement.', 'Consulter le contrat'])
D('contract-sign-reminder', 'c', 'warn', 'contract_link', [['Contract', 'Contrat', 'contract_subject']], null,
  ['Reminder: please sign "{contract_subject}"', 'Your signature is awaited', 'The contract "{contract_subject}" is still waiting for your signature.', 'Sign contract'],
  ['Rappel : merci de signer « {contract_subject} »', 'Votre signature est attendue', 'Le contrat « {contract_subject} » est toujours en attente de votre signature.', 'Signer le contrat'])
D('contract-signed-to-staff', 's', 'success', 'contract_link', [['Contract', 'Contrat', 'contract_subject']], null,
  ['Contract signed: {contract_subject}', 'A contract was signed', 'The client has signed the contract "{contract_subject}".', 'Open contract'],
  ['Contrat signé : {contract_subject}', 'Un contrat a été signé', 'Le client a signé le contrat « {contract_subject} ».', 'Ouvrir le contrat'])
D('contract-comment-to-client', 'c', 'info', 'contract_link', [['Contract', 'Contrat', 'contract_subject']], null,
  ['New comment on contract "{contract_subject}"', 'New comment on your contract', 'A new comment was added to the contract "{contract_subject}".', 'View comment'],
  ['Nouveau commentaire sur le contrat « {contract_subject} »', 'Nouveau commentaire sur votre contrat', 'Un nouveau commentaire a été ajouté au contrat « {contract_subject} ».', 'Voir le commentaire'])
D('contract-comment-to-admin', 's', 'info', 'contract_link', [['Contract', 'Contrat', 'contract_subject']], null,
  ['New comment on contract "{contract_subject}"', 'New comment on a contract', 'A client commented on the contract "{contract_subject}".', 'View comment'],
  ['Nouveau commentaire sur le contrat « {contract_subject} »', 'Nouveau commentaire sur un contrat', 'Un client a commenté le contrat « {contract_subject} ».', 'Voir le commentaire'])
D('contract-expiration', 'n', 'warn', '', [['Contract', 'Contrat', 'contract_subject'], ['Start', 'Début', 'contract_datestart'], ['End', 'Fin', 'contract_dateend']], null,
  ['Contract expiration reminder', 'A contract is about to expire', 'Hello {client_company},\nThe contract "{contract_subject}" is about to expire. Contact us if you would like to renew it.', ''],
  ["Rappel d'expiration du contrat", 'Un contrat arrive à expiration', 'Bonjour {client_company},\nLe contrat « {contract_subject} » arrive bientôt à expiration. Contactez-nous si vous souhaitez le renouveler.', ''])
D('contract-expiration-to-staff', 's', 'warn', '', [['Contract', 'Contrat', 'contract_subject'], ['Start', 'Début', 'contract_datestart'], ['End', 'Fin', 'contract_dateend']], null,
  ['Contract expiration reminder', 'A contract is about to expire', 'The contract "{contract_subject}" is about to expire. Plan the renewal with the client.', ''],
  ["Rappel d'expiration du contrat", 'Un contrat arrive à expiration', 'Le contrat « {contract_subject} » arrive bientôt à expiration. Pensez à planifier le renouvellement avec le client.', ''])

/* ---------- Credit notes, orders, subscriptions ---------- */
D('credit-note-send-to-client', 'c', 'info', '', [['Credit note', 'Avoir', 'credit_note_number'], ['Date', 'Date', 'credit_note_date'], ['Total', 'Total', 'credit_note_total']], null,
  ['Credit note #{credit_note_number}', 'A credit note was issued', 'We have issued a credit note for you. Please find the details below.', ''],
  ['Avoir n°{credit_note_number}', 'Un avoir a été émis', 'Nous avons émis un avoir à votre nom. Voici le détail.', ''])
D('order-to-client', 'n', 'success', 'invoice_link', [['Order', 'Commande', 'order_id'], ['Invoice', 'Facture', 'invoice_number'], ['Total', 'Total', 'total']], null,
  ['Order placed successfully', 'Thank you for your order', 'Your order was placed successfully. You can view the invoice using the button below.', 'View invoice'],
  ['Commande enregistrée', 'Merci pour votre commande', 'Votre commande a bien été enregistrée. Vous pouvez consulter la facture avec le bouton ci-dessous.', 'Voir la facture'])
D('order-to-admin', 's', 'success', 'invoice_link', [['Order', 'Commande', 'order_id'], ['Invoice', 'Facture', 'invoice_number'], ['Total', 'Total', 'total']], null,
  ['New order paid', 'An order was paid', 'A new order has been paid successfully.', 'Open invoice'],
  ['Nouvelle commande payée', 'Une commande a été payée', 'Une nouvelle commande a été payée avec succès.', 'Ouvrir la facture'])
D('send-subscription', 'c', 'info', 'subscription_link', [['Subscription', 'Abonnement', 'subscription_name']], null,
  ['Subscription created', 'Your subscription is ready', 'A subscription "{subscription_name}" was created for you. Open it to review the details and activate it.', 'View subscription'],
  ['Abonnement créé', 'Votre abonnement est prêt', "Un abonnement « {subscription_name} » a été créé pour vous. Ouvrez-le pour vérifier les détails et l'activer.", "Voir l'abonnement"])
D('subscription-payment-failed', 'c', 'danger', '', [['Subscription', 'Abonnement', 'subscription_name']], null,
  ['Your latest subscription payment failed', 'Payment failed', 'The latest payment for "{subscription_name}" could not be processed. Please update your payment method to avoid any interruption.', ''],
  ['Votre dernier paiement a échoué', 'Paiement refusé', "Le dernier paiement de l'abonnement « {subscription_name} » n'a pas pu être traité. Merci de mettre à jour votre moyen de paiement pour éviter toute interruption.", ''])
D('subscription-canceled', 'c', 'warn', '', [['Subscription', 'Abonnement', 'subscription_name']], null,
  ['Your subscription was canceled', 'Subscription canceled', 'Your subscription "{subscription_name}" has been canceled. You will not be charged again.', ''],
  ['Votre abonnement a été annulé', 'Abonnement annulé', "Votre abonnement « {subscription_name} » a été annulé. Vous ne serez plus facturé.", ''])
D('subscription-payment-succeeded', 'c', 'success', '', [['Subscription', 'Abonnement', 'subscription_name'], ['Amount', 'Montant', 'payment_total'], ['Invoice status', 'Statut de la facture', 'invoice_status']], null,
  ['Subscription payment receipt – {subscription_name}', 'Payment received', 'Thank you. Your subscription payment was processed successfully.', ''],
  ["Reçu de paiement d'abonnement – {subscription_name}", 'Paiement reçu', "Merci. Le paiement de votre abonnement a été traité avec succès.", ''])
D('customer-subscribed-to-staff', 's', 'success', 'subscription_link', [['Client', 'Client', 'client_company'], ['Subscription', 'Abonnement', 'subscription_name']], null,
  ['A customer subscribed', 'New subscription', '{client_company} subscribed to "{subscription_name}".', 'Open subscription'],
  ['Un client a souscrit un abonnement', 'Nouvel abonnement', '{client_company} a souscrit à « {subscription_name} ».', "Ouvrir l'abonnement"])
D('subscription-payment-requires-action', 'c', 'warn', 'subscription_authorize_payment_link', [['Subscription', 'Abonnement', 'subscription_name']], null,
  ['Action required: confirm your {subscription_name} payment', 'Please confirm your payment', 'Your bank requires an extra confirmation for the payment of "{subscription_name}".', 'Confirm payment'],
  ['Action requise : confirmez le paiement de {subscription_name}', 'Merci de confirmer votre paiement', 'Votre banque demande une confirmation supplémentaire pour le paiement de « {subscription_name} ».', 'Confirmer le paiement'])

/* ---------- Customers & accounts ---------- */
D('new-client-created', 'c', 'success', '', [], null,
  ['Welcome on board', 'Welcome!', 'Your customer account has been created. You can now follow your projects, invoices and support tickets in one place.', ''],
  ['Bienvenue à bord', 'Bienvenue !', 'Votre compte client a été créé. Vous pouvez désormais suivre vos projets, factures et tickets de support au même endroit.', ''])
D('client-registration-confirmed', 'c', 'success', 'crm_url', [], null,
  ['Your registration is confirmed', 'Registration confirmed', 'Your registration has been confirmed. You can now sign in to your customer area.', 'Sign in'],
  ['Votre inscription est confirmée', 'Inscription confirmée', 'Votre inscription a été confirmée. Vous pouvez maintenant vous connecter à votre espace client.', 'Se connecter'])
D('new-client-registered-to-admin', 's', 'info', '', [['Name', 'Nom', 'contact_firstname'], ['Company', 'Société', 'client_company'], ['Email', 'E-mail', 'contact_email']], null,
  ['New customer registration', 'A new customer registered', 'A new customer has registered and is waiting for your review.', ''],
  ["Enregistrement d'un nouveau client", 'Un nouveau client s\'est inscrit', "Un nouveau client s'est inscrit et attend votre validation.", ''])
D('contact-forgot-password', 'n', 'info', 'reset_password_url', [], null,
  ['Create a new password', 'Reset your password', 'We received a request to reset your password. Click the button below to choose a new one.\nIf you did not ask for this, you can ignore this email.', 'Reset password'],
  ['Créer un nouveau mot de passe', 'Réinitialisez votre mot de passe', "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.\nSi vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.", 'Réinitialiser le mot de passe'])
D('contact-password-reseted', 'n', 'success', '', [['Account', 'Compte', 'contact_email']], null,
  ['Your password was changed', 'Password changed', 'The password of your account was changed. If this was not you, contact us immediately.', ''],
  ['Votre mot de passe a été changé', 'Mot de passe modifié', "Le mot de passe de votre compte a été modifié. Si ce n'était pas vous, contactez-nous immédiatement.", ''])
D('contact-set-password', 'n', 'info', 'set_password_url', [['Account', 'Compte', 'contact_email']], null,
  ['Set a new password on {companyname}', 'Choose your password', 'An account was created for you. Click the button below to set your password and sign in.', 'Set password'],
  ['Définir un mot de passe sur {companyname}', 'Choisissez votre mot de passe', 'Un compte a été créé pour vous. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et vous connecter.', 'Définir le mot de passe'])
D('contact-verification-email', 'cf', 'info', 'email_verification_url', [], null,
  ['Verify your email address', 'Verify your email', 'Please confirm that this is your email address to finish setting up your account.', 'Verify email'],
  ["Vérifier l'adresse e-mail", 'Vérifiez votre adresse e-mail', 'Merci de confirmer que cette adresse e-mail est bien la vôtre pour finaliser votre compte.', "Vérifier l'e-mail"])
D('new-customer-profile-file-uploaded-to-staff', 's', 'info', 'customer_profile_files_admin_link', [['Client', 'Client', 'client_company']], null,
  ['A customer uploaded new files', 'New files uploaded', '{client_company} uploaded new files to their profile.', 'View files'],
  ['Le client a téléchargé de nouveaux fichiers', 'Nouveaux fichiers téléchargés', '{client_company} a téléchargé de nouveaux fichiers dans son profil.', 'Voir les fichiers'])
D('client-statement', 'c', 'info', '', [['Period', 'Période', 'statement_from'], ['To', 'Au', 'statement_to'], ['Balance due', 'Solde dû', 'statement_balance_due']], null,
  ['Account statement from {statement_from} to {statement_to}', 'Your account statement', 'Please find your account statement for the period below.', ''],
  ['Relevé de compte du {statement_from} au {statement_to}', 'Votre relevé de compte', 'Veuillez trouver votre relevé de compte pour la période ci-dessous.', ''])
D('gdpr-removal-request', 's', 'warn', '', [['Contact', 'Contact', 'contact_firstname']], null,
  ['Data removal request received', 'Data removal request', 'A contact asked for their personal data to be removed. Review and process the request.', ''],
  ['Demande de suppression de données reçue', 'Demande de suppression de données', 'Un contact a demandé la suppression de ses données personnelles. Examinez et traitez cette demande.', ''])
D('gdpr-removal-request-lead', 's', 'warn', 'lead_link', [['Lead', 'Prospect', 'lead_name']], null,
  ['Data removal request received', 'Data removal request', 'A lead asked for their personal data to be removed. Review and process the request.', 'Open lead'],
  ['Demande de suppression de données reçue', 'Demande de suppression de données', 'Un prospect a demandé la suppression de ses données personnelles. Examinez et traitez cette demande.', 'Ouvrir le prospect'])

/* ---------- Leads ---------- */
D('new-lead-assigned', 's', 'info', 'lead_link', [['Lead', 'Prospect', 'lead_name'], ['Email', 'E-mail', 'lead_email']], null,
  ['New lead assigned to you', 'A new lead for you', 'The lead {lead_name} has been assigned to you. Reach out while the interest is fresh.', 'Open lead'],
  ['Nouveau prospect qui vous est attribué', 'Un nouveau prospect pour vous', 'Le prospect {lead_name} vous a été attribué. Contactez-le tant que son intérêt est frais.', 'Ouvrir le prospect'])
D('new-web-to-lead-form-submitted', 'n', 'success', '', [], null,
  ['{lead_name} – we received your request', 'We received your request', 'Hello {lead_name},\nThank you for contacting us. Your request has been received and one of our team members will get back to you shortly.', ''],
  ['{lead_name} – nous avons reçu votre demande', 'Nous avons reçu votre demande', "Bonjour {lead_name},\nMerci de nous avoir contactés. Votre demande a bien été reçue et un membre de notre équipe reviendra vers vous très rapidement.", ''])

/* ---------- Projects ---------- */
D('assigned-to-project', 'c', 'info', 'project_link', [['Project', 'Projet', 'project_name'], ['Start date', 'Date de début', 'project_start_date']], null,
  ['New project created', 'A new project has started', 'The project "{project_name}" has been created for you.', 'View project'],
  ['Nouveau projet créé', 'Un nouveau projet démarre', 'Le projet « {project_name} » a été créé pour vous.', 'Voir le projet'])
D('staff-added-as-project-member', 's', 'info', 'project_link', [['Project', 'Projet', 'project_name']], null,
  ['New project assigned to you', 'You joined a project', 'You were added as a member of the project "{project_name}".', 'Open project'],
  ['Nouveau projet qui vous est attribué', 'Vous avez rejoint un projet', 'Vous avez été ajouté comme membre du projet « {project_name} ».', 'Ouvrir le projet'])
D('project-finished-to-customer', 'c', 'success', 'project_link', [['Project', 'Projet', 'project_name']], null,
  ['Project marked as finished', 'Your project is complete', 'The project "{project_name}" has been marked as finished. Thank you for working with us!', 'View project'],
  ['Projet marqué comme terminé', 'Votre projet est terminé', 'Le projet « {project_name} » a été marqué comme terminé. Merci pour votre confiance !', 'Voir le projet'])
D('new-project-discussion-created-to-customer', 'c', 'info', 'discussion_link', [['Project', 'Projet', 'project_name'], ['Subject', 'Sujet', 'discussion_subject'], ['Created by', 'Créée par', 'discussion_creator']], { quote: 'discussion_description' },
  ['New project discussion – {project_name}', 'A new discussion was started', 'A new discussion was created in the project "{project_name}".', 'Open discussion'],
  ['Nouvelle discussion de projet – {project_name}', 'Une nouvelle discussion a été créée', 'Une nouvelle discussion a été créée dans le projet « {project_name} ».', 'Ouvrir la discussion'])
D('new-project-discussion-created-to-staff', 's', 'info', 'discussion_link', [['Project', 'Projet', 'project_name'], ['Subject', 'Sujet', 'discussion_subject'], ['Created by', 'Créée par', 'discussion_creator']], { quote: 'discussion_description' },
  ['New project discussion – {project_name}', 'A new discussion was started', 'A new discussion was created in the project "{project_name}".', 'Open discussion'],
  ['Nouvelle discussion de projet – {project_name}', 'Une nouvelle discussion a été créée', 'Une nouvelle discussion a été créée dans le projet « {project_name} ».', 'Ouvrir la discussion'])
D('new-project-discussion-comment-to-customer', 'c', 'info', 'discussion_link', [['Discussion', 'Discussion', 'discussion_subject'], ['From', 'De', 'comment_creator']], { quote: 'discussion_comment' },
  ['New discussion comment', 'New comment', 'A new comment was posted on a project discussion.', 'Open discussion'],
  ['Nouveau commentaire de discussion', 'Nouveau commentaire', 'Un nouveau commentaire a été publié dans une discussion de projet.', 'Ouvrir la discussion'])
D('new-project-discussion-comment-to-staff', 's', 'info', 'discussion_link', [['Discussion', 'Discussion', 'discussion_subject'], ['From', 'De', 'comment_creator']], { quote: 'discussion_comment' },
  ['New discussion comment', 'New comment', 'A new comment was posted on a project discussion.', 'Open discussion'],
  ['Nouveau commentaire de discussion', 'Nouveau commentaire', 'Un nouveau commentaire a été publié dans une discussion de projet.', 'Ouvrir la discussion'])
D('new-project-file-uploaded-to-customer', 'c', 'info', 'project_link', [['Project', 'Projet', 'project_name'], ['Uploaded by', 'Ajouté par', 'file_creator']], null,
  ['New project files – {project_name}', 'New files were uploaded', 'New files were uploaded to the project "{project_name}".', 'View project'],
  ['Nouveaux fichiers de projet – {project_name}', 'De nouveaux fichiers ont été ajoutés', 'De nouveaux fichiers ont été ajoutés au projet « {project_name} ».', 'Voir le projet'])
D('new-project-file-uploaded-to-staff', 's', 'info', 'project_link', [['Project', 'Projet', 'project_name'], ['Uploaded by', 'Ajouté par', 'file_creator']], null,
  ['New project files – {project_name}', 'New files were uploaded', 'New files were uploaded to the project "{project_name}".', 'View project'],
  ['Nouveaux fichiers de projet – {project_name}', 'De nouveaux fichiers ont été ajoutés', 'De nouveaux fichiers ont été ajoutés au projet « {project_name} ».', 'Voir le projet'])

/* ---------- Tasks ---------- */
D('task-assigned', 's', 'info', 'task_link', [['Task', 'Tâche', 'task_name'], ['Start', 'Début', 'task_startdate'], ['Due', 'Échéance', 'task_duedate'], ['Priority', 'Priorité', 'task_priority']], null,
  ['New task assigned to you – {task_name}', 'A task was assigned to you', 'You have a new task. Here are the details:', 'Open task'],
  ['Nouvelle tâche qui vous est attribuée – {task_name}', 'Une tâche vous a été attribuée', 'Vous avez une nouvelle tâche. Voici le détail :', 'Ouvrir la tâche'])
D('task-added-as-follower', 's', 'info', 'task_link', [['Task', 'Tâche', 'task_name'], ['Start', 'Début', 'task_startdate']], null,
  ['You are following a task – {task_name}', 'You are now a follower', 'You were added as a follower of this task and will be notified of updates.', 'Open task'],
  ['Vous suivez une tâche – {task_name}', 'Vous êtes maintenant suiveur', 'Vous avez été ajouté comme suiveur de cette tâche et serez informé de ses mises à jour.', 'Ouvrir la tâche'])
D('task-commented', 's', 'info', 'task_link', [['Task', 'Tâche', 'task_name']], { quote: 'task_comment' },
  ['New comment on task – {task_name}', 'New comment on a task', 'A comment was added to the task.', 'Open task'],
  ['Nouveau commentaire sur la tâche – {task_name}', 'Nouveau commentaire sur une tâche', 'Un commentaire a été ajouté à la tâche.', 'Ouvrir la tâche'])
D('task-commented-to-contacts', 'c', 'info', 'task_link', [['Task', 'Tâche', 'task_name']], { quote: 'task_comment' },
  ['New comment on task – {task_name}', 'New comment on a task', 'A comment was added to the task.', 'Open task'],
  ['Nouveau commentaire sur la tâche – {task_name}', 'Nouveau commentaire sur une tâche', 'Un commentaire a été ajouté à la tâche.', 'Ouvrir la tâche'])
D('task-added-attachment', 's', 'info', 'task_link', [['Task', 'Tâche', 'task_name']], null,
  ['New attachment on task – {task_name}', 'A file was added', '{task_user_take_action} added an attachment to the task.', 'Open task'],
  ['Nouvelle pièce jointe sur la tâche – {task_name}', 'Un fichier a été ajouté', '{task_user_take_action} a ajouté une pièce jointe à la tâche.', 'Ouvrir la tâche'])
D('task-added-attachment-to-contacts', 'c', 'info', 'task_link', [['Task', 'Tâche', 'task_name']], null,
  ['New attachment on task – {task_name}', 'A file was added', '{task_user_take_action} added an attachment to the task.', 'Open task'],
  ['Nouvelle pièce jointe sur la tâche – {task_name}', 'Un fichier a été ajouté', '{task_user_take_action} a ajouté une pièce jointe à la tâche.', 'Ouvrir la tâche'])
D('task-deadline-notification', 's', 'warn', 'task_link', [['Task', 'Tâche', 'task_name'], ['Due', 'Échéance', 'task_duedate']], null,
  ['Task deadline reminder', 'A deadline is coming up', 'The task below is about to reach its deadline.', 'Open task'],
  ['Rappel de date limite de tâche', 'Une échéance approche', 'La tâche ci-dessous approche de sa date limite.', 'Ouvrir la tâche'])
D('task-status-change-to-staff', 's', 'info', 'task_link', [['Task', 'Tâche', 'task_name'], ['New status', 'Nouveau statut', 'task_status'], ['Due', 'Échéance', 'task_duedate']], null,
  ['Task status changed', 'A task status changed', '{task_user_take_action} changed the status of a task.', 'Open task'],
  ["Statut de la tâche modifié", "Le statut d'une tâche a changé", "{task_user_take_action} a modifié le statut d'une tâche.", 'Ouvrir la tâche'])
D('task-status-change-to-contacts', 'c', 'info', 'task_link', [['Task', 'Tâche', 'task_name'], ['New status', 'Nouveau statut', 'task_status'], ['Due', 'Échéance', 'task_duedate']], null,
  ['Task status changed', 'A task status changed', '{task_user_take_action} changed the status of a task.', 'Open task'],
  ["Statut de la tâche modifié", "Le statut d'une tâche a changé", "{task_user_take_action} a modifié le statut d'une tâche.", 'Ouvrir la tâche'])
D('non-billed-tasks-reminder', 's', 'warn', '', [], { quote: 'unbilled_tasks_list' },
  ['Action required: completed tasks are not billed', 'Unbilled tasks', 'These completed tasks have not been billed yet:', ''],
  ['Action requise : tâches terminées non facturées', 'Tâches non facturées', "Ces tâches terminées n'ont pas encore été facturées :", ''])

/* ---------- Support tickets ---------- */
D('new-ticket-opened-admin', 'c', 'info', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject'], ['Department', 'Département', 'ticket_department'], ['Priority', 'Priorité', 'ticket_priority']], { quote: 'ticket_message' },
  ['New support ticket opened', 'A new ticket was opened', 'A new support ticket has been opened.', 'Open ticket'],
  ["Nouveau ticket d'assistance ouvert", 'Un nouveau ticket a été ouvert', "Un nouveau ticket d'assistance a été ouvert.", 'Ouvrir le ticket'])
D('ticket-autoresponse', 'c', 'info', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject'], ['Department', 'Département', 'ticket_department'], ['Priority', 'Priorité', 'ticket_priority']], { quote: 'ticket_message' },
  ['We received your support request', 'We received your request', 'Your ticket has been created. Our team will reply as soon as possible.', 'View ticket'],
  ['Nous avons reçu votre demande de support', 'Nous avons reçu votre demande', "Votre ticket a été créé. Notre équipe vous répondra dans les meilleurs délais.", 'Voir le ticket'])
D('new-ticket-created-staff', 's', 'info', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject'], ['Department', 'Département', 'ticket_department'], ['Priority', 'Priorité', 'ticket_priority']], { quote: 'ticket_message' },
  ['New ticket created', 'A new ticket was created', 'A new support ticket was created.', 'Open ticket'],
  ['Nouveau ticket créé', 'Un nouveau ticket a été créé', "Un nouveau ticket d'assistance a été créé.", 'Ouvrir le ticket'])
D('ticket-assigned-to-admin', 's', 'info', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject'], ['Department', 'Département', 'ticket_department'], ['Priority', 'Priorité', 'ticket_priority']], { quote: 'ticket_message' },
  ['A support ticket is assigned to you', 'A ticket was assigned to you', 'A support ticket has been assigned to you.', 'Open ticket'],
  ['Un ticket de support vous a été attribué', 'Un ticket vous a été attribué', "Un ticket d'assistance vous a été attribué.", 'Ouvrir le ticket'])
D('ticket-reply', 'c', 'info', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject']], { quote: 'ticket_message' },
  ['New reply to your ticket', 'We replied to your ticket', 'There is a new reply on your support ticket.', 'View ticket'],
  ['Nouvelle réponse à votre ticket', 'Nous avons répondu à votre ticket', 'Il y a une nouvelle réponse sur votre ticket de support.', 'Voir le ticket'])
D('ticket-reply-to-admin', 'c', 'info', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject'], ['Department', 'Département', 'ticket_department'], ['Priority', 'Priorité', 'ticket_priority']], { quote: 'ticket_message' },
  ['New reply on a support ticket', 'A customer replied', 'There is a new reply on a support ticket.', 'Open ticket'],
  ['Nouvelle réponse sur un ticket', 'Un client a répondu', 'Il y a une nouvelle réponse sur un ticket de support.', 'Ouvrir le ticket'])
D('auto-close-ticket', 'c', 'warn', 'ticket_url', [['Ticket', 'Ticket', 'ticket_id'], ['Subject', 'Sujet', 'ticket_subject']], null,
  ['Ticket closed automatically', 'Your ticket was closed', 'Your ticket was closed automatically because we did not hear back from you. Reply to reopen it at any time.', 'View ticket'],
  ['Ticket fermé automatiquement', 'Votre ticket a été fermé', "Votre ticket a été fermé automatiquement faute de réponse de votre part. Répondez pour le rouvrir à tout moment.", 'Voir le ticket'])

/* ---------- Staff ---------- */
D('new-staff-created', 's', 'success', 'admin_url', [['Email', 'E-mail', 'staff_email'], ['Password', 'Mot de passe', 'password']], null,
  ['You were added as a staff member', 'Welcome to the team', 'An account has been created for you. Sign in with the details below, then change your password.', 'Sign in'],
  ['Vous avez été ajouté comme membre du personnel', "Bienvenue dans l'équipe", 'Un compte a été créé pour vous. Connectez-vous avec les informations ci-dessous, puis changez votre mot de passe.', 'Se connecter'])
D('staff-forgot-password', 'n', 'info', 'reset_password_url', [], null,
  ['Create a new password', 'Reset your password', 'We received a request to reset your password. Click the button below to choose a new one.\nIf you did not ask for this, you can ignore this email.', 'Reset password'],
  ['Créer un nouveau mot de passe', 'Réinitialisez votre mot de passe', "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.", 'Réinitialiser le mot de passe'])
D('staff-password-reseted', 'n', 'success', '', [['Account', 'Compte', 'staff_email']], null,
  ['Your password was changed', 'Password changed', 'The password of your account was changed. If this was not you, contact an administrator immediately.', ''],
  ['Votre mot de passe a été changé', 'Mot de passe modifié', "Le mot de passe de votre compte a été modifié. Si ce n'était pas vous, contactez immédiatement un administrateur.", ''])
D('two-factor-authentication', 's', 'info', '', [], { code: 'two_factor_auth_code' },
  ['Confirm your sign-in', 'Confirm your sign-in', 'Use the code below to finish signing in. It expires in a few minutes.', ''],
  ['Confirmez votre connexion', 'Confirmez votre connexion', 'Utilisez le code ci-dessous pour terminer votre connexion. Il expire dans quelques minutes.', ''])
D('reminder-email-staff', 's', 'warn', 'staff_reminder_relation_link', [['Related to', 'Concerne', 'staff_reminder_relation_name']], { quote: 'staff_reminder_description' },
  ['You have a new reminder!', 'Reminder', 'You asked to be reminded about:', 'Open'],
  ['Vous avez un nouveau rappel !', 'Rappel', 'Vous avez demandé à être rappelé à propos de :', 'Ouvrir'])
D('event-notification-to-staff', 's', 'info', 'event_link', [['Event', 'Événement', 'event_title'], ['Starts', 'Début', 'event_start_date']], null,
  ['Upcoming event – {event_title}', 'An event is coming up', 'This is a reminder for an upcoming event.', 'Open event'],
  ['Événement à venir – {event_title}', 'Un événement approche', 'Ceci est un rappel pour un événement à venir.', "Ouvrir l'événement"])
D('send-request-approve', 's', 'warn', 'object_link', [['Item', 'Élément', 'object_name'], ['Type', 'Type', 'object_type']], null,
  ['Approval required', 'Your approval is needed', 'An item is waiting for your approval.', 'Review'],
  ['Approbation requise', 'Votre approbation est requise', 'Un élément attend votre approbation.', 'Examiner'])
D('send_approve', 's', 'success', 'object_link', [['Item', 'Élément', 'object_name'], ['Type', 'Type', 'object_type']], null,
  ['The {object_type} has been approved', 'Approved', 'Your {object_type} was approved.', 'View'],
  ['Le/la {object_type} a été approuvé(e)', 'Approuvé', 'Votre demande ({object_type}) a été approuvée.', 'Voir'])
D('send_rejected', 's', 'danger', 'object_link', [['Item', 'Élément', 'object_name'], ['Type', 'Type', 'object_type']], null,
  ['The {object_type} has been rejected', 'Rejected', 'Your {object_type} was rejected.', 'View'],
  ['Le/la {object_type} a été rejeté(e)', 'Rejeté', 'Votre demande ({object_type}) a été rejetée.', 'Voir'])
D('attendance_notice', 'st', 'info', '', [['Type', 'Type', 'type_check'], ['Time', 'Heure', 'date_time']], null,
  ['Timesheets – attendance notice', 'Attendance notice', 'An attendance entry was recorded.', ''],
  ['Feuilles de temps – avis de présence', 'Avis de présence', 'Une présence a été enregistrée.', ''])
D('send_request_approval', 'n', 'warn', 'link', [['Requested by', 'Demandé par', 'staff_name']], null,
  ['Timesheets – approval request', 'Approval request', 'Hello {approver},\n{staff_name} sent a request that needs your approval.', 'Review request'],
  ['Feuilles de temps – demande d\'approbation', "Demande d'approbation", "Bonjour {approver},\n{staff_name} a envoyé une demande qui nécessite votre approbation.", 'Examiner la demande'])
D('remind_user_check_in', 'n', 'warn', '', [['Time', 'Heure', 'date_time']], null,
  ['Timesheets – check-in reminder', "Don't forget to check in", 'This is a reminder to check in for your shift.', ''],
  ['Feuilles de temps – rappel de pointage', "N'oubliez pas de pointer", 'Ceci est un rappel pour pointer votre arrivée.', ''])
D('new_leave_application_send_to_notification_recipient', 'n', 'info', 'link', [['Employee', 'Employé', 'staff_name'], ['Date', 'Date', 'date_time']], null,
  ['Timesheets – new leave application', 'New leave application', '{staff_name} submitted a leave application.', 'Review application'],
  ['Feuilles de temps – nouvelle demande de congé', 'Nouvelle demande de congé', '{staff_name} a soumis une demande de congé.', 'Examiner la demande'])
