// Spanish, Japanese and Arabic texts of the ready-made email designs (same slugs as catalog.js).
// templates: slug -> [subject, title, body, button label]; rowLabels: English label -> translation; fixed: greetings, regards, button help.
export const TRANSLATIONS = {
 "spanish": {
  "templates": {
   "invoice-send-to-client": [
    "Factura {invoice_number} de {companyname}",
    "Su factura está lista",
    "Gracias por su confianza. La factura {invoice_number} ha sido emitida y está disponible en línea.\nPuede consultarla, descargarla y seguir el estado de su pago en cualquier momento.",
    "Ver factura"
   ],
   "invoice-already-send": [
    "Factura {invoice_number}",
    "Aquí tiene su factura de nuevo",
    "Tal como lo solicitó, aquí está el enlace a la factura {invoice_number}.",
    "Ver factura"
   ],
   "invoice-due-notice": [
    "La factura {invoice_number} vence pronto",
    "Su factura vence pronto",
    "Le recordamos amablemente que la factura {invoice_number} vencerá el {invoice_duedate}.\nSi ya la ha pagado, por favor ignore este mensaje.",
    "Ver y pagar"
   ],
   "invoice-overdue-notice": [
    "Factura vencida {invoice_number}",
    "Su factura está vencida",
    "La factura {invoice_number} venció el {invoice_duedate} y aún no hemos recibido el pago.\nLe rogamos que la regularice lo antes posible o que nos contacte si hay algún problema.",
    "Ver factura"
   ],
   "invoice-payment-recorded": [
    "Pago recibido de la factura {invoice_number}",
    "Pago recibido, ¡gracias!",
    "Hemos registrado su pago de la factura {invoice_number}. Estos son los detalles:",
    "Ver factura"
   ],
   "invoice-payment-recorded-to-staff": [
    "Nuevo pago en la factura {invoice_number}",
    "Se registró un pago",
    "Se ha registrado un nuevo pago en la factura {invoice_number}.",
    "Abrir factura"
   ],
   "invoices-batch-payments": [
    "Hemos recibido sus pagos",
    "Pagos recibidos, ¡gracias!",
    "Hemos recibido los siguientes pagos:",
    ""
   ],
   "estimate-send-to-client": [
    "Presupuesto {estimate_number} – {client_company}",
    "Su presupuesto está listo",
    "Le enviamos nuestro presupuesto {estimate_number}. Puede revisarlo en línea y aceptarlo con un solo clic.\nNo dude en contactarnos si necesita algún ajuste.",
    "Ver presupuesto"
   ],
   "estimate-already-send": [
    "Presupuesto {estimate_number}",
    "Aquí tiene su presupuesto de nuevo",
    "Tal como lo solicitó, aquí está el enlace al presupuesto {estimate_number}.",
    "Ver presupuesto"
   ],
   "estimate-declined-to-staff": [
    "Presupuesto {estimate_number} rechazado",
    "Se rechazó un presupuesto",
    "{client_company} ha rechazado el presupuesto {estimate_number}.",
    "Abrir presupuesto"
   ],
   "estimate-accepted-to-staff": [
    "Presupuesto {estimate_number} aceptado",
    "Se aceptó un presupuesto",
    "Buenas noticias: {client_company} ha aceptado el presupuesto {estimate_number}.",
    "Abrir presupuesto"
   ],
   "estimate-thank-you-to-customer": [
    "Gracias por aceptar nuestro presupuesto",
    "Gracias por su confianza",
    "Gracias por aceptar nuestro presupuesto. Comenzaremos de inmediato y le mantendremos informado de cada paso.",
    ""
   ],
   "estimate-expiry-reminder": [
    "El presupuesto {estimate_number} vence pronto",
    "Su presupuesto vence pronto",
    "El presupuesto {estimate_number} es válido hasta el {estimate_expirydate}. Revíselo y acéptelo antes de esa fecha para mantener las condiciones presupuestadas.",
    "Ver presupuesto"
   ],
   "estimate-request-submitted-to-staff": [
    "Nueva solicitud de presupuesto",
    "Nueva solicitud de presupuesto",
    "Se ha enviado una nueva solicitud de presupuesto.",
    "Abrir solicitud"
   ],
   "estimate-request-assigned": [
    "Se le ha asignado una solicitud de presupuesto",
    "Solicitud de presupuesto asignada",
    "Se le ha asignado una solicitud de presupuesto.",
    "Abrir solicitud"
   ],
   "estimate-request-received-to-user": [
    "Hemos recibido su solicitud de presupuesto",
    "Solicitud recibida",
    "Gracias. Hemos recibido su solicitud de presupuesto y nos pondremos en contacto con usted en breve.",
    ""
   ],
   "proposal-send-to-customer": [
    "Propuesta {proposal_number} – {proposal_subject}",
    "Una propuesta para usted",
    "Hola {proposal_proposal_to},\nHemos preparado una propuesta para \"{proposal_subject}\". Puede leerla en línea y comunicarnos su decisión.",
    "Ver propuesta"
   ],
   "proposal-client-accepted": [
    "Propuesta {proposal_number} aceptada",
    "Se aceptó una propuesta",
    "{proposal_proposal_to} ha aceptado la propuesta \"{proposal_subject}\".",
    "Abrir propuesta"
   ],
   "proposal-client-declined": [
    "Propuesta {proposal_number} rechazada",
    "Se rechazó una propuesta",
    "{proposal_proposal_to} ha rechazado la propuesta \"{proposal_subject}\".",
    "Abrir propuesta"
   ],
   "proposal-client-thank-you": [
    "Gracias por aceptar nuestra propuesta",
    "Gracias por su confianza",
    "Hola {proposal_proposal_to},\nGracias por aceptar nuestra propuesta. Estamos encantados de trabajar con usted y nos pondremos en contacto en breve con los siguientes pasos.",
    ""
   ],
   "proposal-comment-to-client": [
    "Nuevo comentario en la propuesta {proposal_number}",
    "Nuevo comentario en su propuesta",
    "Hola {proposal_proposal_to},\nSe ha añadido un nuevo comentario a la propuesta {proposal_number}.",
    "Ver comentario"
   ],
   "proposal-comment-to-admin": [
    "Nuevo comentario en la propuesta {proposal_number}",
    "Nuevo comentario en una propuesta",
    "Un cliente ha comentado la propuesta \"{proposal_subject}\".",
    "Ver comentario"
   ],
   "proposal-expiry-reminder": [
    "La propuesta {proposal_number} vence pronto",
    "Su propuesta vence pronto",
    "Hola {proposal_proposal_to},\nLa propuesta {proposal_number} está abierta hasta el {proposal_open_till}. Por favor, revísela antes de esa fecha.",
    "Ver propuesta"
   ],
   "send-contract": [
    "Contrato – {contract_subject}",
    "Un contrato para revisar y firmar",
    "Le enviamos el contrato \"{contract_subject}\". Puede leerlo en línea y firmarlo electrónicamente.",
    "Revisar contrato"
   ],
   "contract-sign-reminder": [
    "Recordatorio: por favor firme \"{contract_subject}\"",
    "Esperamos su firma",
    "El contrato \"{contract_subject}\" sigue pendiente de su firma.",
    "Firmar contrato"
   ],
   "contract-signed-to-staff": [
    "Contrato firmado: {contract_subject}",
    "Se firmó un contrato",
    "El cliente ha firmado el contrato \"{contract_subject}\".",
    "Abrir contrato"
   ],
   "contract-comment-to-client": [
    "Nuevo comentario en el contrato \"{contract_subject}\"",
    "Nuevo comentario en su contrato",
    "Se ha añadido un nuevo comentario al contrato \"{contract_subject}\".",
    "Ver comentario"
   ],
   "contract-comment-to-admin": [
    "Nuevo comentario en el contrato \"{contract_subject}\"",
    "Nuevo comentario en un contrato",
    "Un cliente ha comentado el contrato \"{contract_subject}\".",
    "Ver comentario"
   ],
   "contract-expiration": [
    "Recordatorio de vencimiento de contrato",
    "Un contrato está por vencer",
    "Hola {client_company},\nEl contrato \"{contract_subject}\" está por vencer. Contáctenos si desea renovarlo.",
    ""
   ],
   "contract-expiration-to-staff": [
    "Recordatorio de vencimiento de contrato",
    "Un contrato está por vencer",
    "El contrato \"{contract_subject}\" está por vencer. Planifique la renovación con el cliente.",
    ""
   ],
   "credit-note-send-to-client": [
    "Nota de crédito #{credit_note_number}",
    "Se emitió una nota de crédito",
    "Hemos emitido una nota de crédito a su nombre. Encontrará los detalles a continuación.",
    ""
   ],
   "order-to-client": [
    "Pedido realizado con éxito",
    "Gracias por su pedido",
    "Su pedido se realizó con éxito. Puede ver la factura con el botón de abajo.",
    "Ver factura"
   ],
   "order-to-admin": [
    "Nuevo pedido pagado",
    "Se pagó un pedido",
    "Se ha pagado correctamente un nuevo pedido.",
    "Abrir factura"
   ],
   "send-subscription": [
    "Suscripción creada",
    "Su suscripción está lista",
    "Se ha creado para usted la suscripción \"{subscription_name}\". Ábrala para revisar los detalles y activarla.",
    "Ver suscripción"
   ],
   "subscription-payment-failed": [
    "Falló el último pago de su suscripción",
    "Pago fallido",
    "No se pudo procesar el último pago de \"{subscription_name}\". Por favor, actualice su método de pago para evitar interrupciones.",
    ""
   ],
   "subscription-canceled": [
    "Su suscripción fue cancelada",
    "Suscripción cancelada",
    "Su suscripción \"{subscription_name}\" ha sido cancelada. No se le volverá a cobrar.",
    ""
   ],
   "subscription-payment-succeeded": [
    "Recibo de pago de suscripción – {subscription_name}",
    "Pago recibido",
    "Gracias. El pago de su suscripción se procesó correctamente.",
    ""
   ],
   "customer-subscribed-to-staff": [
    "Un cliente se suscribió",
    "Nueva suscripción",
    "{client_company} se ha suscrito a \"{subscription_name}\".",
    "Abrir suscripción"
   ],
   "subscription-payment-requires-action": [
    "Acción requerida: confirme su pago de {subscription_name}",
    "Por favor, confirme su pago",
    "Su banco requiere una confirmación adicional para el pago de \"{subscription_name}\".",
    "Confirmar pago"
   ],
   "new-client-created": [
    "Bienvenido a bordo",
    "¡Bienvenido!",
    "Su cuenta de cliente ha sido creada. Ahora puede consultar sus proyectos, facturas y tickets de soporte en un solo lugar.",
    ""
   ],
   "client-registration-confirmed": [
    "Su registro está confirmado",
    "Registro confirmado",
    "Su registro ha sido confirmado. Ya puede iniciar sesión en su área de cliente.",
    "Iniciar sesión"
   ],
   "new-client-registered-to-admin": [
    "Nuevo registro de cliente",
    "Se registró un nuevo cliente",
    "Un nuevo cliente se ha registrado y está pendiente de su revisión.",
    ""
   ],
   "contact-forgot-password": [
    "Cree una nueva contraseña",
    "Restablezca su contraseña",
    "Hemos recibido una solicitud para restablecer su contraseña. Haga clic en el botón de abajo para elegir una nueva.\nSi usted no la solicitó, puede ignorar este correo.",
    "Restablecer contraseña"
   ],
   "contact-password-reseted": [
    "Su contraseña fue cambiada",
    "Contraseña cambiada",
    "La contraseña de su cuenta fue cambiada. Si no fue usted, contáctenos de inmediato.",
    ""
   ],
   "contact-set-password": [
    "Establezca una nueva contraseña en {companyname}",
    "Elija su contraseña",
    "Se ha creado una cuenta para usted. Haga clic en el botón de abajo para establecer su contraseña e iniciar sesión.",
    "Establecer contraseña"
   ],
   "contact-verification-email": [
    "Verifique su correo electrónico",
    "Verifique su correo",
    "Por favor, confirme que esta es su dirección de correo electrónico para terminar de configurar su cuenta.",
    "Verificar correo"
   ],
   "new-customer-profile-file-uploaded-to-staff": [
    "Un cliente subió nuevos archivos",
    "Nuevos archivos subidos",
    "{client_company} ha subido nuevos archivos a su perfil.",
    "Ver archivos"
   ],
   "client-statement": [
    "Estado de cuenta del {statement_from} al {statement_to}",
    "Su estado de cuenta",
    "Le enviamos su estado de cuenta del período indicado a continuación.",
    ""
   ],
   "gdpr-removal-request": [
    "Solicitud de eliminación de datos recibida",
    "Solicitud de eliminación de datos",
    "Un contacto ha solicitado la eliminación de sus datos personales. Revise y procese la solicitud.",
    ""
   ],
   "gdpr-removal-request-lead": [
    "Solicitud de eliminación de datos recibida",
    "Solicitud de eliminación de datos",
    "Un lead ha solicitado la eliminación de sus datos personales. Revise y procese la solicitud.",
    "Abrir lead"
   ],
   "new-lead-assigned": [
    "Se le ha asignado un nuevo lead",
    "Un nuevo lead para usted",
    "El lead {lead_name} le ha sido asignado. Contáctelo mientras el interés sea reciente.",
    "Abrir lead"
   ],
   "new-web-to-lead-form-submitted": [
    "{lead_name} – hemos recibido su solicitud",
    "Hemos recibido su solicitud",
    "Hola {lead_name},\nGracias por contactarnos. Hemos recibido su solicitud y un miembro de nuestro equipo se pondrá en contacto con usted en breve.",
    ""
   ],
   "assigned-to-project": [
    "Nuevo proyecto creado",
    "Ha comenzado un nuevo proyecto",
    "Se ha creado para usted el proyecto \"{project_name}\".",
    "Ver proyecto"
   ],
   "staff-added-as-project-member": [
    "Se le ha asignado un nuevo proyecto",
    "Se ha unido a un proyecto",
    "Ha sido añadido como miembro del proyecto \"{project_name}\".",
    "Abrir proyecto"
   ],
   "project-finished-to-customer": [
    "Proyecto marcado como finalizado",
    "Su proyecto está completo",
    "El proyecto \"{project_name}\" ha sido marcado como finalizado. ¡Gracias por trabajar con nosotros!",
    "Ver proyecto"
   ],
   "new-project-discussion-created-to-customer": [
    "Nueva discusión de proyecto – {project_name}",
    "Se inició una nueva discusión",
    "Se ha creado una nueva discusión en el proyecto \"{project_name}\".",
    "Abrir discusión"
   ],
   "new-project-discussion-created-to-staff": [
    "Nueva discusión de proyecto – {project_name}",
    "Se inició una nueva discusión",
    "Se ha creado una nueva discusión en el proyecto \"{project_name}\".",
    "Abrir discusión"
   ],
   "new-project-discussion-comment-to-customer": [
    "Nuevo comentario en la discusión",
    "Nuevo comentario",
    "Se ha publicado un nuevo comentario en una discusión de proyecto.",
    "Abrir discusión"
   ],
   "new-project-discussion-comment-to-staff": [
    "Nuevo comentario en la discusión",
    "Nuevo comentario",
    "Se ha publicado un nuevo comentario en una discusión de proyecto.",
    "Abrir discusión"
   ],
   "new-project-file-uploaded-to-customer": [
    "Nuevos archivos del proyecto – {project_name}",
    "Se subieron nuevos archivos",
    "Se han subido nuevos archivos al proyecto \"{project_name}\".",
    "Ver proyecto"
   ],
   "new-project-file-uploaded-to-staff": [
    "Nuevos archivos del proyecto – {project_name}",
    "Se subieron nuevos archivos",
    "Se han subido nuevos archivos al proyecto \"{project_name}\".",
    "Ver proyecto"
   ],
   "task-assigned": [
    "Nueva tarea asignada – {task_name}",
    "Se le asignó una tarea",
    "Tiene una nueva tarea. Estos son los detalles:",
    "Abrir tarea"
   ],
   "task-added-as-follower": [
    "Está siguiendo una tarea – {task_name}",
    "Ahora es seguidor",
    "Ha sido añadido como seguidor de esta tarea y recibirá notificaciones de las actualizaciones.",
    "Abrir tarea"
   ],
   "task-commented": [
    "Nuevo comentario en la tarea – {task_name}",
    "Nuevo comentario en una tarea",
    "Se ha añadido un comentario a la tarea.",
    "Abrir tarea"
   ],
   "task-commented-to-contacts": [
    "Nuevo comentario en la tarea – {task_name}",
    "Nuevo comentario en una tarea",
    "Se ha añadido un comentario a la tarea.",
    "Abrir tarea"
   ],
   "task-added-attachment": [
    "Nuevo adjunto en la tarea – {task_name}",
    "Se añadió un archivo",
    "{task_user_take_action} ha añadido un adjunto a la tarea.",
    "Abrir tarea"
   ],
   "task-added-attachment-to-contacts": [
    "Nuevo adjunto en la tarea – {task_name}",
    "Se añadió un archivo",
    "{task_user_take_action} ha añadido un adjunto a la tarea.",
    "Abrir tarea"
   ],
   "task-deadline-notification": [
    "Recordatorio de fecha límite de tarea",
    "Se acerca una fecha límite",
    "La tarea siguiente está por alcanzar su fecha límite.",
    "Abrir tarea"
   ],
   "task-status-change-to-staff": [
    "Estado de tarea modificado",
    "Cambió el estado de una tarea",
    "{task_user_take_action} ha cambiado el estado de una tarea.",
    "Abrir tarea"
   ],
   "task-status-change-to-contacts": [
    "Estado de tarea modificado",
    "Cambió el estado de una tarea",
    "{task_user_take_action} ha cambiado el estado de una tarea.",
    "Abrir tarea"
   ],
   "non-billed-tasks-reminder": [
    "Acción requerida: hay tareas completadas sin facturar",
    "Tareas sin facturar",
    "Estas tareas completadas aún no han sido facturadas:",
    ""
   ],
   "new-ticket-opened-admin": [
    "Nuevo ticket de soporte abierto",
    "Se abrió un nuevo ticket",
    "Se ha abierto un nuevo ticket de soporte.",
    "Abrir ticket"
   ],
   "ticket-autoresponse": [
    "Hemos recibido su solicitud de soporte",
    "Hemos recibido su solicitud",
    "Su ticket ha sido creado. Nuestro equipo responderá lo antes posible.",
    "Ver ticket"
   ],
   "new-ticket-created-staff": [
    "Nuevo ticket creado",
    "Se creó un nuevo ticket",
    "Se ha creado un nuevo ticket de soporte.",
    "Abrir ticket"
   ],
   "ticket-assigned-to-admin": [
    "Se le ha asignado un ticket de soporte",
    "Se le asignó un ticket",
    "Se le ha asignado un ticket de soporte.",
    "Abrir ticket"
   ],
   "ticket-reply": [
    "Nueva respuesta a su ticket",
    "Hemos respondido a su ticket",
    "Hay una nueva respuesta en su ticket de soporte.",
    "Ver ticket"
   ],
   "ticket-reply-to-admin": [
    "Nueva respuesta en un ticket de soporte",
    "Un cliente respondió",
    "Hay una nueva respuesta en un ticket de soporte.",
    "Abrir ticket"
   ],
   "auto-close-ticket": [
    "Ticket cerrado automáticamente",
    "Su ticket fue cerrado",
    "Su ticket fue cerrado automáticamente porque no recibimos respuesta suya. Responda para reabrirlo en cualquier momento.",
    "Ver ticket"
   ],
   "new-staff-created": [
    "Ha sido añadido como miembro del equipo",
    "Bienvenido al equipo",
    "Se ha creado una cuenta para usted. Inicie sesión con los datos de abajo y luego cambie su contraseña.",
    "Iniciar sesión"
   ],
   "staff-forgot-password": [
    "Cree una nueva contraseña",
    "Restablezca su contraseña",
    "Hemos recibido una solicitud para restablecer su contraseña. Haga clic en el botón de abajo para elegir una nueva.\nSi usted no la solicitó, puede ignorar este correo.",
    "Restablecer contraseña"
   ],
   "staff-password-reseted": [
    "Su contraseña fue cambiada",
    "Contraseña cambiada",
    "La contraseña de su cuenta fue cambiada. Si no fue usted, contacte a un administrador de inmediato.",
    ""
   ],
   "two-factor-authentication": [
    "Confirme su inicio de sesión",
    "Confirme su inicio de sesión",
    "Use el código de abajo para terminar de iniciar sesión. Caduca en pocos minutos.",
    ""
   ],
   "reminder-email-staff": [
    "¡Tiene un nuevo recordatorio!",
    "Recordatorio",
    "Usted pidió que se le recordara lo siguiente:",
    "Abrir"
   ],
   "event-notification-to-staff": [
    "Próximo evento – {event_title}",
    "Se acerca un evento",
    "Este es un recordatorio de un próximo evento.",
    "Abrir evento"
   ],
   "send-request-approve": [
    "Aprobación requerida",
    "Se necesita su aprobación",
    "Hay un elemento pendiente de su aprobación.",
    "Revisar"
   ],
   "send_approve": [
    "El {object_type} ha sido aprobado",
    "Aprobado",
    "Su {object_type} fue aprobado.",
    "Ver"
   ],
   "send_rejected": [
    "El {object_type} ha sido rechazado",
    "Rechazado",
    "Su {object_type} fue rechazado.",
    "Ver"
   ],
   "attendance_notice": [
    "Hojas de horas – aviso de asistencia",
    "Aviso de asistencia",
    "Se ha registrado una entrada de asistencia.",
    ""
   ],
   "send_request_approval": [
    "Hojas de horas – solicitud de aprobación",
    "Solicitud de aprobación",
    "Hola {approver},\n{staff_name} ha enviado una solicitud que requiere su aprobación.",
    "Revisar solicitud"
   ],
   "remind_user_check_in": [
    "Hojas de horas – recordatorio de registro de entrada",
    "No olvide registrar su entrada",
    "Este es un recordatorio para registrar su entrada al turno.",
    ""
   ],
   "new_leave_application_send_to_notification_recipient": [
    "Hojas de horas – nueva solicitud de ausencia",
    "Nueva solicitud de ausencia",
    "{staff_name} ha enviado una solicitud de ausencia.",
    "Revisar solicitud"
   ],
   "purchase-order-send-to-client": [
    "Orden de compra {purchase_order_number} de {companyname}",
    "Su orden de compra",
    "Adjuntamos la orden de compra {purchase_order_number}. Por favor, revísela e infórmenos si es necesario cambiar algo.",
    ""
   ],
   "purchase-order-confirmed": [
    "Pedido {purchase_order_number} confirmado",
    "Su pedido está confirmado",
    "Gracias. La orden de compra {purchase_order_number} está confirmada y estamos comenzando.",
    ""
   ]
  },
  "rowLabels": {
   "Invoice": "Factura",
   "Status": "Estado",
   "Due date": "Fecha de vencimiento",
   "Amount received": "Importe recibido",
   "Date": "Fecha",
   "Estimate": "Presupuesto",
   "Company": "Empresa",
   "Client": "Cliente",
   "Valid until": "Válido hasta",
   "Form": "Formulario",
   "Email": "Correo electrónico",
   "Request": "Solicitud",
   "Proposal": "Propuesta",
   "Subject": "Asunto",
   "Total": "Total",
   "Open until": "Abierta hasta",
   "Contract": "Contrato",
   "Start": "Inicio",
   "End": "Fin",
   "Credit note": "Nota de crédito",
   "Order": "Pedido",
   "Subscription": "Suscripción",
   "Amount": "Importe",
   "Invoice status": "Estado de la factura",
   "Name": "Nombre",
   "Account": "Cuenta",
   "Period": "Período",
   "To": "Hasta",
   "Balance due": "Saldo pendiente",
   "Contact": "Contacto",
   "Lead": "Lead",
   "Project": "Proyecto",
   "Start date": "Fecha de inicio",
   "Created by": "Creado por",
   "Discussion": "Discusión",
   "From": "De",
   "Uploaded by": "Subido por",
   "Task": "Tarea",
   "Due": "Vence",
   "Priority": "Prioridad",
   "New status": "Nuevo estado",
   "Ticket": "Ticket",
   "Department": "Departamento",
   "Password": "Contraseña",
   "Related to": "Relacionado con",
   "Event": "Evento",
   "Starts": "Comienza",
   "Item": "Elemento",
   "Type": "Tipo",
   "Time": "Hora",
   "Requested by": "Solicitado por",
   "Employee": "Empleado",
   "Purchase order": "Orden de compra",
   "Expected delivery": "Entrega prevista"
  },
  "fixed": {
   "hello_c": "Hola {contact_firstname} {contact_lastname},",
   "hello_cf": "Hola {contact_firstname},",
   "hello_s": "Hola {staff_firstname},",
   "hello_st": "Hola {staff_name},",
   "regards": "Saludos cordiales,",
   "buttonHelp": "Si el botón no funciona, copie este enlace en su navegador:"
  }
 },
 "japanese": {
  "templates": {
   "invoice-send-to-client": [
    "{companyname}より請求書 {invoice_number} のご送付",
    "請求書をご用意いたしました",
    "平素よりご愛顧いただき、誠にありがとうございます。請求書 {invoice_number} を発行いたしました。オンラインでご確認いただけます。\n請求書の閲覧、ダウンロード、お支払い状況の確認はいつでも可能です。",
    "請求書を表示"
   ],
   "invoice-already-send": [
    "請求書 {invoice_number}",
    "請求書を再送いたします",
    "ご依頼のとおり、請求書 {invoice_number} へのリンクをお送りいたします。",
    "請求書を表示"
   ],
   "invoice-due-notice": [
    "請求書 {invoice_number} のお支払い期限が近づいております",
    "お支払い期限が近づいております",
    "請求書 {invoice_number} のお支払い期限が {invoice_duedate} に迫っておりますので、ご案内申し上げます。\nすでにお支払い済みの場合は、本メールをご放念ください。",
    "確認してお支払い"
   ],
   "invoice-overdue-notice": [
    "請求書 {invoice_number} のお支払い期限超過のお知らせ",
    "お支払い期限を過ぎております",
    "請求書 {invoice_number} のお支払い期限は {invoice_duedate} でしたが、まだご入金を確認できておりません。\nお手数ですが、できるだけ早くお支払いいただけますようお願いいたします。ご不明な点がございましたら、ご連絡ください。",
    "請求書を表示"
   ],
   "invoice-payment-recorded": [
    "請求書 {invoice_number} のご入金を確認いたしました",
    "ご入金ありがとうございます",
    "請求書 {invoice_number} のご入金を記録いたしました。詳細は以下のとおりです。",
    "請求書を表示"
   ],
   "invoice-payment-recorded-to-staff": [
    "請求書 {invoice_number} に新しい入金がありました",
    "入金が記録されました",
    "請求書 {invoice_number} に新しい入金が記録されました。",
    "請求書を開く"
   ],
   "invoices-batch-payments": [
    "ご入金を確認いたしました",
    "ご入金ありがとうございます",
    "以下のご入金を確認いたしました。",
    ""
   ],
   "estimate-send-to-client": [
    "見積書 {estimate_number} – {client_company}",
    "見積書をご用意いたしました",
    "見積書 {estimate_number} をお送りいたします。オンラインでご確認のうえ、ワンクリックで承認いただけます。\n修正のご希望がございましたら、お気軽にご連絡ください。",
    "見積書を表示"
   ],
   "estimate-already-send": [
    "見積書 {estimate_number}",
    "見積書を再送いたします",
    "ご依頼のとおり、見積書 {estimate_number} へのリンクをお送りいたします。",
    "見積書を表示"
   ],
   "estimate-declined-to-staff": [
    "見積書 {estimate_number} が却下されました",
    "見積書が却下されました",
    "{client_company} が見積書 {estimate_number} を却下しました。",
    "見積書を開く"
   ],
   "estimate-accepted-to-staff": [
    "見積書 {estimate_number} が承認されました",
    "見積書が承認されました",
    "朗報です。{client_company} が見積書 {estimate_number} を承認しました。",
    "見積書を開く"
   ],
   "estimate-thank-you-to-customer": [
    "見積書をご承認いただきありがとうございます",
    "ご信頼いただきありがとうございます",
    "見積書をご承認いただき、誠にありがとうございます。直ちに作業に着手し、各段階の進捗をお知らせいたします。",
    ""
   ],
   "estimate-expiry-reminder": [
    "見積書 {estimate_number} の有効期限が近づいております",
    "見積書の有効期限が近づいております",
    "見積書 {estimate_number} の有効期限は {estimate_expirydate} までです。見積条件を維持するため、期限内にご確認のうえ承認をお願いいたします。",
    "見積書を表示"
   ],
   "estimate-request-submitted-to-staff": [
    "新しい見積依頼",
    "新しい見積依頼",
    "新しい見積依頼が送信されました。",
    "依頼を開く"
   ],
   "estimate-request-assigned": [
    "見積依頼があなたに割り当てられました",
    "見積依頼が割り当てられました",
    "見積依頼があなたに割り当てられました。",
    "依頼を開く"
   ],
   "estimate-request-received-to-user": [
    "見積依頼を受け付けました",
    "依頼を受け付けました",
    "ありがとうございます。見積依頼を受け付けました。追ってご連絡いたします。",
    ""
   ],
   "proposal-send-to-customer": [
    "提案書 {proposal_number} – {proposal_subject}",
    "提案書をお送りいたします",
    "{proposal_proposal_to} 様、\n「{proposal_subject}」についての提案書をご用意いたしました。オンラインでご覧いただき、ご判断をお知らせください。",
    "提案書を表示"
   ],
   "proposal-client-accepted": [
    "提案書 {proposal_number} が承認されました",
    "提案書が承認されました",
    "{proposal_proposal_to} が提案書「{proposal_subject}」を承認しました。",
    "提案書を開く"
   ],
   "proposal-client-declined": [
    "提案書 {proposal_number} が却下されました",
    "提案書が却下されました",
    "{proposal_proposal_to} が提案書「{proposal_subject}」を却下しました。",
    "提案書を開く"
   ],
   "proposal-client-thank-you": [
    "提案書をご承認いただきありがとうございます",
    "ご信頼いただきありがとうございます",
    "{proposal_proposal_to} 様、\n提案書をご承認いただき、誠にありがとうございます。ご一緒にお仕事できることを楽しみにしております。次のステップについて、追ってご連絡いたします。",
    ""
   ],
   "proposal-comment-to-client": [
    "提案書 {proposal_number} に新しいコメントがあります",
    "提案書に新しいコメントがあります",
    "{proposal_proposal_to} 様、\n提案書 {proposal_number} に新しいコメントが追加されました。",
    "コメントを表示"
   ],
   "proposal-comment-to-admin": [
    "提案書 {proposal_number} に新しいコメントがあります",
    "提案書に新しいコメントがあります",
    "クライアントが提案書「{proposal_subject}」にコメントしました。",
    "コメントを表示"
   ],
   "proposal-expiry-reminder": [
    "提案書 {proposal_number} の有効期限が近づいております",
    "提案書の有効期限が近づいております",
    "{proposal_proposal_to} 様、\n提案書 {proposal_number} は {proposal_open_till} までご覧いただけます。期限までにご確認をお願いいたします。",
    "提案書を表示"
   ],
   "send-contract": [
    "契約書 – {contract_subject}",
    "ご確認・ご署名をお願いする契約書",
    "契約書「{contract_subject}」をお送りいたします。オンラインでご覧いただき、電子署名が可能です。",
    "契約書を確認"
   ],
   "contract-sign-reminder": [
    "リマインダー:「{contract_subject}」にご署名ください",
    "ご署名をお待ちしております",
    "契約書「{contract_subject}」は、まだご署名をいただいておりません。",
    "契約書に署名"
   ],
   "contract-signed-to-staff": [
    "契約書が署名されました: {contract_subject}",
    "契約書が署名されました",
    "クライアントが契約書「{contract_subject}」に署名しました。",
    "契約書を開く"
   ],
   "contract-comment-to-client": [
    "契約書「{contract_subject}」に新しいコメントがあります",
    "契約書に新しいコメントがあります",
    "契約書「{contract_subject}」に新しいコメントが追加されました。",
    "コメントを表示"
   ],
   "contract-comment-to-admin": [
    "契約書「{contract_subject}」に新しいコメントがあります",
    "契約書に新しいコメントがあります",
    "クライアントが契約書「{contract_subject}」にコメントしました。",
    "コメントを表示"
   ],
   "contract-expiration": [
    "契約期限のお知らせ",
    "契約の期限が近づいております",
    "{client_company} 様、\n契約書「{contract_subject}」の期限が近づいております。更新をご希望の場合は、ご連絡ください。",
    ""
   ],
   "contract-expiration-to-staff": [
    "契約期限のお知らせ",
    "契約の期限が近づいています",
    "契約書「{contract_subject}」の期限が近づいています。クライアントと更新の計画を立ててください。",
    ""
   ],
   "credit-note-send-to-client": [
    "クレジットノート #{credit_note_number}",
    "クレジットノートを発行いたしました",
    "クレジットノートを発行いたしました。詳細は以下をご確認ください。",
    ""
   ],
   "order-to-client": [
    "ご注文を承りました",
    "ご注文ありがとうございます",
    "ご注文を承りました。下のボタンから請求書をご確認いただけます。",
    "請求書を表示"
   ],
   "order-to-admin": [
    "新しい注文の支払いが完了しました",
    "注文の支払いが完了しました",
    "新しい注文の支払いが正常に完了しました。",
    "請求書を開く"
   ],
   "send-subscription": [
    "サブスクリプションを作成しました",
    "サブスクリプションをご用意いたしました",
    "サブスクリプション「{subscription_name}」を作成いたしました。詳細をご確認のうえ、有効化してください。",
    "サブスクリプションを表示"
   ],
   "subscription-payment-failed": [
    "サブスクリプションの最新のお支払いに失敗しました",
    "お支払いに失敗しました",
    "「{subscription_name}」の最新のお支払いを処理できませんでした。サービスが中断されないよう、お支払い方法を更新してください。",
    ""
   ],
   "subscription-canceled": [
    "サブスクリプションが解約されました",
    "サブスクリプションが解約されました",
    "サブスクリプション「{subscription_name}」は解約されました。今後ご請求が発生することはありません。",
    ""
   ],
   "subscription-payment-succeeded": [
    "サブスクリプションのお支払い領収書 – {subscription_name}",
    "ご入金を確認いたしました",
    "ありがとうございます。サブスクリプションのお支払いが正常に処理されました。",
    ""
   ],
   "customer-subscribed-to-staff": [
    "顧客がサブスクリプションに申し込みました",
    "新しいサブスクリプション",
    "{client_company} が「{subscription_name}」に申し込みました。",
    "サブスクリプションを開く"
   ],
   "subscription-payment-requires-action": [
    "対応が必要です: {subscription_name} のお支払いをご確認ください",
    "お支払いをご確認ください",
    "「{subscription_name}」のお支払いについて、銀行による追加の確認が必要です。",
    "お支払いを確認"
   ],
   "new-client-created": [
    "ようこそ",
    "ようこそ!",
    "お客様アカウントを作成いたしました。プロジェクト、請求書、サポートチケットをまとめて確認できるようになりました。",
    ""
   ],
   "client-registration-confirmed": [
    "ご登録が確認されました",
    "登録が確認されました",
    "ご登録が確認されました。お客様エリアにサインインしてご利用いただけます。",
    "サインイン"
   ],
   "new-client-registered-to-admin": [
    "新しい顧客登録",
    "新しい顧客が登録されました",
    "新しい顧客が登録され、確認をお待ちしています。",
    ""
   ],
   "contact-forgot-password": [
    "新しいパスワードの作成",
    "パスワードの再設定",
    "パスワードの再設定のリクエストを受け付けました。下のボタンをクリックして、新しいパスワードを設定してください。\nお心当たりがない場合は、本メールを無視していただいて問題ありません。",
    "パスワードを再設定"
   ],
   "contact-password-reseted": [
    "パスワードが変更されました",
    "パスワードが変更されました",
    "アカウントのパスワードが変更されました。お心当たりがない場合は、直ちにご連絡ください。",
    ""
   ],
   "contact-set-password": [
    "{companyname} の新しいパスワードを設定してください",
    "パスワードを設定してください",
    "アカウントを作成いたしました。下のボタンをクリックしてパスワードを設定し、サインインしてください。",
    "パスワードを設定"
   ],
   "contact-verification-email": [
    "メールアドレスの確認",
    "メールアドレスの確認",
    "アカウントの設定を完了するため、こちらがお客様のメールアドレスであることをご確認ください。",
    "メールアドレスを確認"
   ],
   "new-customer-profile-file-uploaded-to-staff": [
    "顧客が新しいファイルをアップロードしました",
    "新しいファイルがアップロードされました",
    "{client_company} がプロフィールに新しいファイルをアップロードしました。",
    "ファイルを表示"
   ],
   "client-statement": [
    "{statement_from} から {statement_to} までの取引明細書",
    "取引明細書",
    "下記期間の取引明細書をお送りいたします。",
    ""
   ],
   "gdpr-removal-request": [
    "データ削除リクエストを受け付けました",
    "データ削除リクエスト",
    "連絡先から個人データの削除を求められました。リクエストを確認し、対応してください。",
    ""
   ],
   "gdpr-removal-request-lead": [
    "データ削除リクエストを受け付けました",
    "データ削除リクエスト",
    "リードから個人データの削除を求められました。リクエストを確認し、対応してください。",
    "リードを開く"
   ],
   "new-lead-assigned": [
    "新しいリードがあなたに割り当てられました",
    "新しいリードがあります",
    "リード {lead_name} があなたに割り当てられました。関心が高いうちにご連絡ください。",
    "リードを開く"
   ],
   "new-web-to-lead-form-submitted": [
    "{lead_name} 様 – お問い合わせを受け付けました",
    "お問い合わせを受け付けました",
    "{lead_name} 様、\nお問い合わせいただき、ありがとうございます。ご依頼を受け付けました。担当者より追ってご連絡いたします。",
    ""
   ],
   "assigned-to-project": [
    "新しいプロジェクトを作成しました",
    "新しいプロジェクトが開始されました",
    "プロジェクト「{project_name}」を作成いたしました。",
    "プロジェクトを表示"
   ],
   "staff-added-as-project-member": [
    "新しいプロジェクトがあなたに割り当てられました",
    "プロジェクトに参加しました",
    "プロジェクト「{project_name}」のメンバーに追加されました。",
    "プロジェクトを開く"
   ],
   "project-finished-to-customer": [
    "プロジェクトが完了としてマークされました",
    "プロジェクトが完了いたしました",
    "プロジェクト「{project_name}」が完了としてマークされました。ご利用いただき、誠にありがとうございました。",
    "プロジェクトを表示"
   ],
   "new-project-discussion-created-to-customer": [
    "新しいプロジェクトディスカッション – {project_name}",
    "新しいディスカッションが開始されました",
    "プロジェクト「{project_name}」で新しいディスカッションが作成されました。",
    "ディスカッションを開く"
   ],
   "new-project-discussion-created-to-staff": [
    "新しいプロジェクトディスカッション – {project_name}",
    "新しいディスカッションが開始されました",
    "プロジェクト「{project_name}」で新しいディスカッションが作成されました。",
    "ディスカッションを開く"
   ],
   "new-project-discussion-comment-to-customer": [
    "ディスカッションに新しいコメントがあります",
    "新しいコメント",
    "プロジェクトのディスカッションに新しいコメントが投稿されました。",
    "ディスカッションを開く"
   ],
   "new-project-discussion-comment-to-staff": [
    "ディスカッションに新しいコメントがあります",
    "新しいコメント",
    "プロジェクトのディスカッションに新しいコメントが投稿されました。",
    "ディスカッションを開く"
   ],
   "new-project-file-uploaded-to-customer": [
    "プロジェクトの新しいファイル – {project_name}",
    "新しいファイルがアップロードされました",
    "プロジェクト「{project_name}」に新しいファイルがアップロードされました。",
    "プロジェクトを表示"
   ],
   "new-project-file-uploaded-to-staff": [
    "プロジェクトの新しいファイル – {project_name}",
    "新しいファイルがアップロードされました",
    "プロジェクト「{project_name}」に新しいファイルがアップロードされました。",
    "プロジェクトを表示"
   ],
   "task-assigned": [
    "新しいタスクがあなたに割り当てられました – {task_name}",
    "タスクが割り当てられました",
    "新しいタスクがあります。詳細は以下のとおりです。",
    "タスクを開く"
   ],
   "task-added-as-follower": [
    "タスクをフォローしています – {task_name}",
    "フォロワーになりました",
    "このタスクのフォロワーに追加されました。更新があるとお知らせします。",
    "タスクを開く"
   ],
   "task-commented": [
    "タスクに新しいコメントがあります – {task_name}",
    "タスクに新しいコメントがあります",
    "タスクにコメントが追加されました。",
    "タスクを開く"
   ],
   "task-commented-to-contacts": [
    "タスクに新しいコメントがあります – {task_name}",
    "タスクに新しいコメントがあります",
    "タスクにコメントが追加されました。",
    "タスクを開く"
   ],
   "task-added-attachment": [
    "タスクに新しい添付ファイルがあります – {task_name}",
    "ファイルが追加されました",
    "{task_user_take_action} がタスクに添付ファイルを追加しました。",
    "タスクを開く"
   ],
   "task-added-attachment-to-contacts": [
    "タスクに新しい添付ファイルがあります – {task_name}",
    "ファイルが追加されました",
    "{task_user_take_action} がタスクに添付ファイルを追加しました。",
    "タスクを開く"
   ],
   "task-deadline-notification": [
    "タスク期限のリマインダー",
    "期限が近づいています",
    "以下のタスクの期限が近づいています。",
    "タスクを開く"
   ],
   "task-status-change-to-staff": [
    "タスクのステータスが変更されました",
    "タスクのステータスが変更されました",
    "{task_user_take_action} がタスクのステータスを変更しました。",
    "タスクを開く"
   ],
   "task-status-change-to-contacts": [
    "タスクのステータスが変更されました",
    "タスクのステータスが変更されました",
    "{task_user_take_action} がタスクのステータスを変更しました。",
    "タスクを開く"
   ],
   "non-billed-tasks-reminder": [
    "対応が必要です: 完了したタスクが未請求です",
    "未請求のタスク",
    "以下の完了済みタスクはまだ請求されていません。",
    ""
   ],
   "new-ticket-opened-admin": [
    "新しいサポートチケットが開かれました",
    "新しいチケットが開かれました",
    "新しいサポートチケットが開かれました。",
    "チケットを開く"
   ],
   "ticket-autoresponse": [
    "サポートのご依頼を受け付けました",
    "ご依頼を受け付けました",
    "チケットを作成いたしました。担当チームができるだけ早くご返信いたします。",
    "チケットを表示"
   ],
   "new-ticket-created-staff": [
    "新しいチケットが作成されました",
    "新しいチケットが作成されました",
    "新しいサポートチケットが作成されました。",
    "チケットを開く"
   ],
   "ticket-assigned-to-admin": [
    "サポートチケットがあなたに割り当てられました",
    "チケットが割り当てられました",
    "サポートチケットがあなたに割り当てられました。",
    "チケットを開く"
   ],
   "ticket-reply": [
    "チケットに新しい返信があります",
    "チケットに返信いたしました",
    "サポートチケットに新しい返信があります。",
    "チケットを表示"
   ],
   "ticket-reply-to-admin": [
    "サポートチケットに新しい返信があります",
    "顧客から返信がありました",
    "サポートチケットに新しい返信があります。",
    "チケットを開く"
   ],
   "auto-close-ticket": [
    "チケットが自動的にクローズされました",
    "チケットがクローズされました",
    "ご返信がなかったため、チケットを自動的にクローズいたしました。ご返信いただければ、いつでも再開できます。",
    "チケットを表示"
   ],
   "new-staff-created": [
    "スタッフとして追加されました",
    "チームへようこそ",
    "アカウントを作成いたしました。以下の情報でサインインし、パスワードを変更してください。",
    "サインイン"
   ],
   "staff-forgot-password": [
    "新しいパスワードの作成",
    "パスワードの再設定",
    "パスワードの再設定のリクエストを受け付けました。下のボタンをクリックして、新しいパスワードを設定してください。\nお心当たりがない場合は、本メールを無視していただいて問題ありません。",
    "パスワードを再設定"
   ],
   "staff-password-reseted": [
    "パスワードが変更されました",
    "パスワードが変更されました",
    "アカウントのパスワードが変更されました。お心当たりがない場合は、直ちに管理者にご連絡ください。",
    ""
   ],
   "two-factor-authentication": [
    "サインインの確認",
    "サインインの確認",
    "以下のコードを使用してサインインを完了してください。コードの有効期限は数分間です。",
    ""
   ],
   "reminder-email-staff": [
    "新しいリマインダーがあります",
    "リマインダー",
    "以下についてリマインドするよう設定されています。",
    "開く"
   ],
   "event-notification-to-staff": [
    "まもなく開催のイベント – {event_title}",
    "イベントが近づいています",
    "まもなく開催されるイベントのリマインダーです。",
    "イベントを開く"
   ],
   "send-request-approve": [
    "承認が必要です",
    "承認をお願いします",
    "承認をお待ちの項目があります。",
    "確認する"
   ],
   "send_approve": [
    "{object_type} が承認されました",
    "承認されました",
    "{object_type} が承認されました。",
    "表示"
   ],
   "send_rejected": [
    "{object_type} が却下されました",
    "却下されました",
    "{object_type} が却下されました。",
    "表示"
   ],
   "attendance_notice": [
    "勤怠管理 – 勤怠通知",
    "勤怠通知",
    "勤怠の記録が登録されました。",
    ""
   ],
   "send_request_approval": [
    "勤怠管理 – 承認依頼",
    "承認依頼",
    "{approver} 様、\n{staff_name} から承認が必要な申請が送信されました。",
    "申請を確認"
   ],
   "remind_user_check_in": [
    "勤怠管理 – 出勤打刻のリマインダー",
    "出勤打刻をお忘れなく",
    "シフトの出勤打刻を行うためのリマインダーです。",
    ""
   ],
   "new_leave_application_send_to_notification_recipient": [
    "勤怠管理 – 新しい休暇申請",
    "新しい休暇申請",
    "{staff_name} が休暇申請を提出しました。",
    "申請を確認"
   ],
   "purchase-order-send-to-client": [
    "{companyname}より発注書 {purchase_order_number} のご送付",
    "発注書をお送りいたします",
    "発注書 {purchase_order_number} を添付いたします。内容をご確認のうえ、変更が必要な点がございましたらお知らせください。",
    ""
   ],
   "purchase-order-confirmed": [
    "発注 {purchase_order_number} が確定いたしました",
    "ご注文が確定いたしました",
    "ありがとうございます。発注書 {purchase_order_number} が確定いたしました。作業に着手いたします。",
    ""
   ]
  },
  "rowLabels": {
   "Invoice": "請求書",
   "Status": "ステータス",
   "Due date": "支払期限",
   "Amount received": "入金額",
   "Date": "日付",
   "Estimate": "見積書",
   "Company": "会社",
   "Client": "クライアント",
   "Valid until": "有効期限",
   "Form": "フォーム",
   "Email": "メールアドレス",
   "Request": "依頼",
   "Proposal": "提案書",
   "Subject": "件名",
   "Total": "合計",
   "Open until": "閲覧可能期限",
   "Contract": "契約書",
   "Start": "開始",
   "End": "終了",
   "Credit note": "クレジットノート",
   "Order": "注文",
   "Subscription": "サブスクリプション",
   "Amount": "金額",
   "Invoice status": "請求書のステータス",
   "Name": "名前",
   "Account": "アカウント",
   "Period": "期間",
   "To": "宛先",
   "Balance due": "未払残高",
   "Contact": "連絡先",
   "Lead": "リード",
   "Project": "プロジェクト",
   "Start date": "開始日",
   "Created by": "作成者",
   "Discussion": "ディスカッション",
   "From": "送信者",
   "Uploaded by": "アップロード者",
   "Task": "タスク",
   "Due": "期限",
   "Priority": "優先度",
   "New status": "新しいステータス",
   "Ticket": "チケット",
   "Department": "部署",
   "Password": "パスワード",
   "Related to": "関連項目",
   "Event": "イベント",
   "Starts": "開始日時",
   "Item": "項目",
   "Type": "種類",
   "Time": "時刻",
   "Requested by": "申請者",
   "Employee": "従業員",
   "Purchase order": "発注書",
   "Expected delivery": "納品予定日"
  },
  "fixed": {
   "hello_c": "{contact_firstname} {contact_lastname} 様、",
   "hello_cf": "{contact_firstname} 様、",
   "hello_s": "{staff_firstname} 様、",
   "hello_st": "{staff_name} 様、",
   "regards": "よろしくお願いいたします。",
   "buttonHelp": "ボタンが機能しない場合は、このリンクをブラウザにコピーしてください:"
  }
 },
 "arabic": {
  "templates": {
   "invoice-send-to-client": [
    "الفاتورة {invoice_number} من {companyname}",
    "فاتورتك جاهزة",
    "نشكركم على ثقتكم. تم إصدار الفاتورة {invoice_number} وهي متاحة عبر الإنترنت.\nيمكنكم الاطلاع عليها وتحميلها ومتابعة حالة سدادها في أي وقت.",
    "عرض الفاتورة"
   ],
   "invoice-already-send": [
    "الفاتورة {invoice_number}",
    "إليكم فاتورتكم مرة أخرى",
    "بناءً على طلبكم، إليكم رابط الفاتورة {invoice_number}.",
    "عرض الفاتورة"
   ],
   "invoice-due-notice": [
    "اقتراب موعد استحقاق الفاتورة {invoice_number}",
    "اقتراب موعد استحقاق فاتورتك",
    "هذا تذكير ودي بأن الفاتورة {invoice_number} ستستحق بتاريخ {invoice_duedate}.\nإذا كنتم قد سددتموها بالفعل، يرجى تجاهل هذه الرسالة.",
    "عرض الفاتورة والدفع"
   ],
   "invoice-overdue-notice": [
    "الفاتورة {invoice_number} متأخرة السداد",
    "فاتورتك متأخرة السداد",
    "كان موعد استحقاق الفاتورة {invoice_number} بتاريخ {invoice_duedate} ولم نتوصل بالدفعة بعد.\nيرجى تسويتها في أقرب وقت ممكن، أو التواصل معنا في حال وجود أي مشكلة.",
    "عرض الفاتورة"
   ],
   "invoice-payment-recorded": [
    "تم استلام دفعة للفاتورة {invoice_number}",
    "تم استلام الدفعة، شكراً لكم!",
    "لقد سجلنا دفعتكم للفاتورة {invoice_number}. إليكم التفاصيل:",
    "عرض الفاتورة"
   ],
   "invoice-payment-recorded-to-staff": [
    "دفعة جديدة على الفاتورة {invoice_number}",
    "تم تسجيل دفعة",
    "تم تسجيل دفعة جديدة على الفاتورة {invoice_number}.",
    "فتح الفاتورة"
   ],
   "invoices-batch-payments": [
    "لقد استلمنا دفعاتكم",
    "تم استلام الدفعات، شكراً لكم!",
    "لقد استلمنا الدفعات التالية:",
    ""
   ],
   "estimate-send-to-client": [
    "عرض السعر {estimate_number} – {client_company}",
    "عرض السعر الخاص بكم جاهز",
    "تجدون طيه عرض السعر {estimate_number}. يمكنكم مراجعته عبر الإنترنت وقبوله بنقرة واحدة.\nلا تترددوا في التواصل معنا إذا احتجتم إلى أي تعديل.",
    "عرض عرض السعر"
   ],
   "estimate-already-send": [
    "عرض السعر {estimate_number}",
    "إليكم عرض السعر مرة أخرى",
    "بناءً على طلبكم، إليكم رابط عرض السعر {estimate_number}.",
    "عرض عرض السعر"
   ],
   "estimate-declined-to-staff": [
    "تم رفض عرض السعر {estimate_number}",
    "تم رفض عرض سعر",
    "قامت {client_company} برفض عرض السعر {estimate_number}.",
    "فتح عرض السعر"
   ],
   "estimate-accepted-to-staff": [
    "تم قبول عرض السعر {estimate_number}",
    "تم قبول عرض سعر",
    "خبر سار: قامت {client_company} بقبول عرض السعر {estimate_number}.",
    "فتح عرض السعر"
   ],
   "estimate-thank-you-to-customer": [
    "شكراً لقبولكم عرض السعر",
    "شكراً لثقتكم",
    "شكراً لقبولكم عرض السعر الخاص بنا. سنبدأ العمل فوراً وسنوافيكم بكل مرحلة.",
    ""
   ],
   "estimate-expiry-reminder": [
    "اقتراب انتهاء صلاحية عرض السعر {estimate_number}",
    "اقتراب انتهاء صلاحية عرض السعر الخاص بكم",
    "عرض السعر {estimate_number} صالح حتى {estimate_expirydate}. يرجى مراجعته وقبوله قبل هذا التاريخ للحفاظ على الشروط المعروضة.",
    "عرض عرض السعر"
   ],
   "estimate-request-submitted-to-staff": [
    "طلب عرض سعر جديد",
    "طلب عرض سعر جديد",
    "تم تقديم طلب عرض سعر جديد.",
    "فتح الطلب"
   ],
   "estimate-request-assigned": [
    "تم إسناد طلب عرض سعر إليك",
    "تم إسناد طلب عرض سعر",
    "تم إسناد طلب عرض سعر إليك.",
    "فتح الطلب"
   ],
   "estimate-request-received-to-user": [
    "لقد استلمنا طلب عرض السعر الخاص بكم",
    "تم استلام الطلب",
    "شكراً لكم. لقد استلمنا طلب عرض السعر الخاص بكم وسنعاود التواصل معكم قريباً.",
    ""
   ],
   "proposal-send-to-customer": [
    "المقترح {proposal_number} – {proposal_subject}",
    "مقترح مُعَد لكم",
    "مرحباً {proposal_proposal_to}،\nلقد أعددنا مقترحاً بخصوص «{proposal_subject}». يمكنكم الاطلاع عليه عبر الإنترنت وإبلاغنا بقراركم.",
    "عرض المقترح"
   ],
   "proposal-client-accepted": [
    "تم قبول المقترح {proposal_number}",
    "تم قبول مقترح",
    "قام {proposal_proposal_to} بقبول المقترح «{proposal_subject}».",
    "فتح المقترح"
   ],
   "proposal-client-declined": [
    "تم رفض المقترح {proposal_number}",
    "تم رفض مقترح",
    "قام {proposal_proposal_to} برفض المقترح «{proposal_subject}».",
    "فتح المقترح"
   ],
   "proposal-client-thank-you": [
    "شكراً لقبولكم مقترحنا",
    "شكراً لثقتكم",
    "مرحباً {proposal_proposal_to}،\nشكراً لقبولكم مقترحنا. يسعدنا العمل معكم وسنتواصل معكم قريباً بخصوص الخطوات التالية.",
    ""
   ],
   "proposal-comment-to-client": [
    "تعليق جديد على المقترح {proposal_number}",
    "تعليق جديد على مقترحكم",
    "مرحباً {proposal_proposal_to}،\nتمت إضافة تعليق جديد على المقترح {proposal_number}.",
    "عرض التعليق"
   ],
   "proposal-comment-to-admin": [
    "تعليق جديد على المقترح {proposal_number}",
    "تعليق جديد على مقترح",
    "قام أحد العملاء بالتعليق على المقترح «{proposal_subject}».",
    "عرض التعليق"
   ],
   "proposal-expiry-reminder": [
    "اقتراب انتهاء صلاحية المقترح {proposal_number}",
    "اقتراب انتهاء صلاحية مقترحكم",
    "مرحباً {proposal_proposal_to}،\nالمقترح {proposal_number} متاح حتى {proposal_open_till}. يرجى مراجعته قبل هذا التاريخ.",
    "عرض المقترح"
   ],
   "send-contract": [
    "عقد – {contract_subject}",
    "عقد للمراجعة والتوقيع",
    "تجدون طيه العقد «{contract_subject}». يمكنكم الاطلاع عليه عبر الإنترنت وتوقيعه إلكترونياً.",
    "مراجعة العقد"
   ],
   "contract-sign-reminder": [
    "تذكير: يرجى توقيع «{contract_subject}»",
    "ننتظر توقيعكم",
    "لا يزال العقد «{contract_subject}» في انتظار توقيعكم.",
    "توقيع العقد"
   ],
   "contract-signed-to-staff": [
    "تم توقيع العقد: {contract_subject}",
    "تم توقيع عقد",
    "قام العميل بتوقيع العقد «{contract_subject}».",
    "فتح العقد"
   ],
   "contract-comment-to-client": [
    "تعليق جديد على العقد «{contract_subject}»",
    "تعليق جديد على عقدكم",
    "تمت إضافة تعليق جديد على العقد «{contract_subject}».",
    "عرض التعليق"
   ],
   "contract-comment-to-admin": [
    "تعليق جديد على العقد «{contract_subject}»",
    "تعليق جديد على عقد",
    "قام أحد العملاء بالتعليق على العقد «{contract_subject}».",
    "عرض التعليق"
   ],
   "contract-expiration": [
    "تذكير بانتهاء العقد",
    "عقد على وشك الانتهاء",
    "مرحباً {client_company}،\nالعقد «{contract_subject}» على وشك الانتهاء. تواصلوا معنا إذا رغبتم في تجديده.",
    ""
   ],
   "contract-expiration-to-staff": [
    "تذكير بانتهاء العقد",
    "عقد على وشك الانتهاء",
    "العقد «{contract_subject}» على وشك الانتهاء. يرجى الإعداد للتجديد مع العميل.",
    ""
   ],
   "credit-note-send-to-client": [
    "إشعار دائن #{credit_note_number}",
    "تم إصدار إشعار دائن",
    "لقد أصدرنا إشعاراً دائناً لكم. تجدون التفاصيل أدناه.",
    ""
   ],
   "order-to-client": [
    "تم تسجيل الطلب بنجاح",
    "شكراً لطلبكم",
    "تم تسجيل طلبكم بنجاح. يمكنكم عرض الفاتورة عبر الزر أدناه.",
    "عرض الفاتورة"
   ],
   "order-to-admin": [
    "تم دفع طلب جديد",
    "تم دفع طلب",
    "تم دفع طلب جديد بنجاح.",
    "فتح الفاتورة"
   ],
   "send-subscription": [
    "تم إنشاء الاشتراك",
    "اشتراكك جاهز",
    "تم إنشاء اشتراك «{subscription_name}» لكم. افتحوه لمراجعة التفاصيل وتفعيله.",
    "عرض الاشتراك"
   ],
   "subscription-payment-failed": [
    "فشلت آخر دفعة لاشتراككم",
    "فشلت عملية الدفع",
    "تعذرت معالجة آخر دفعة للاشتراك «{subscription_name}». يرجى تحديث وسيلة الدفع لتفادي أي انقطاع.",
    ""
   ],
   "subscription-canceled": [
    "تم إلغاء اشتراككم",
    "تم إلغاء الاشتراك",
    "تم إلغاء اشتراككم «{subscription_name}». لن يتم خصم أي مبلغ منكم مرة أخرى.",
    ""
   ],
   "subscription-payment-succeeded": [
    "إيصال دفعة الاشتراك – {subscription_name}",
    "تم استلام الدفعة",
    "شكراً لكم. تمت معالجة دفعة اشتراككم بنجاح.",
    ""
   ],
   "customer-subscribed-to-staff": [
    "اشتراك عميل جديد",
    "اشتراك جديد",
    "اشتركت {client_company} في «{subscription_name}».",
    "فتح الاشتراك"
   ],
   "subscription-payment-requires-action": [
    "إجراء مطلوب: أكدوا دفعة {subscription_name}",
    "يرجى تأكيد دفعتكم",
    "يتطلب مصرفكم تأكيداً إضافياً لدفعة «{subscription_name}».",
    "تأكيد الدفع"
   ],
   "new-client-created": [
    "أهلاً بكم",
    "أهلاً بكم!",
    "تم إنشاء حساب العميل الخاص بكم. يمكنكم الآن متابعة مشاريعكم وفواتيركم وتذاكر الدعم في مكان واحد.",
    ""
   ],
   "client-registration-confirmed": [
    "تم تأكيد تسجيلكم",
    "تم تأكيد التسجيل",
    "تم تأكيد تسجيلكم. يمكنكم الآن تسجيل الدخول إلى فضاء العميل الخاص بكم.",
    "تسجيل الدخول"
   ],
   "new-client-registered-to-admin": [
    "تسجيل عميل جديد",
    "تسجيل عميل جديد",
    "قام عميل جديد بالتسجيل وهو في انتظار مراجعتكم.",
    ""
   ],
   "contact-forgot-password": [
    "إنشاء كلمة مرور جديدة",
    "إعادة تعيين كلمة المرور",
    "لقد توصلنا بطلب إعادة تعيين كلمة المرور الخاصة بكم. انقروا على الزر أدناه لاختيار كلمة مرور جديدة.\nإذا لم تطلبوا ذلك، يمكنكم تجاهل هذا البريد الإلكتروني.",
    "إعادة تعيين كلمة المرور"
   ],
   "contact-password-reseted": [
    "تم تغيير كلمة المرور الخاصة بكم",
    "تم تغيير كلمة المرور",
    "تم تغيير كلمة مرور حسابكم. إذا لم تكونوا أنتم من قام بذلك، يرجى التواصل معنا فوراً.",
    ""
   ],
   "contact-set-password": [
    "تعيين كلمة مرور جديدة على {companyname}",
    "اختاروا كلمة المرور الخاصة بكم",
    "تم إنشاء حساب لكم. انقروا على الزر أدناه لتعيين كلمة المرور وتسجيل الدخول.",
    "تعيين كلمة المرور"
   ],
   "contact-verification-email": [
    "تأكيد عنوان بريدكم الإلكتروني",
    "تأكيد البريد الإلكتروني",
    "يرجى تأكيد أن هذا هو عنوان بريدكم الإلكتروني لإتمام إعداد حسابكم.",
    "تأكيد البريد الإلكتروني"
   ],
   "new-customer-profile-file-uploaded-to-staff": [
    "قام عميل برفع ملفات جديدة",
    "تم رفع ملفات جديدة",
    "قامت {client_company} برفع ملفات جديدة إلى ملفها الشخصي.",
    "عرض الملفات"
   ],
   "client-statement": [
    "كشف الحساب من {statement_from} إلى {statement_to}",
    "كشف حسابكم",
    "تجدون طيه كشف حسابكم للفترة المبينة أدناه.",
    ""
   ],
   "gdpr-removal-request": [
    "تم استلام طلب حذف البيانات",
    "طلب حذف البيانات",
    "طلب أحد جهات الاتصال حذف بياناته الشخصية. يرجى مراجعة الطلب ومعالجته.",
    ""
   ],
   "gdpr-removal-request-lead": [
    "تم استلام طلب حذف البيانات",
    "طلب حذف البيانات",
    "طلب أحد العملاء المحتملين حذف بياناته الشخصية. يرجى مراجعة الطلب ومعالجته.",
    "فتح العميل المحتمل"
   ],
   "new-lead-assigned": [
    "تم إسناد عميل محتمل جديد إليك",
    "عميل محتمل جديد لك",
    "تم إسناد العميل المحتمل {lead_name} إليك. بادر بالتواصل معه ما دام اهتمامه حاضراً.",
    "فتح العميل المحتمل"
   ],
   "new-web-to-lead-form-submitted": [
    "{lead_name} – لقد استلمنا طلبكم",
    "لقد استلمنا طلبكم",
    "مرحباً {lead_name}،\nشكراً لتواصلكم معنا. تم استلام طلبكم وسيعاود أحد أعضاء فريقنا التواصل معكم قريباً.",
    ""
   ],
   "assigned-to-project": [
    "تم إنشاء مشروع جديد",
    "بدأ مشروع جديد",
    "تم إنشاء المشروع «{project_name}» لكم.",
    "عرض المشروع"
   ],
   "staff-added-as-project-member": [
    "تم إسناد مشروع جديد إليك",
    "انضممت إلى مشروع",
    "تمت إضافتك كعضو في المشروع «{project_name}».",
    "فتح المشروع"
   ],
   "project-finished-to-customer": [
    "تم وضع علامة اكتمال على المشروع",
    "مشروعكم مكتمل",
    "تم وضع علامة اكتمال على المشروع «{project_name}». شكراً لعملكم معنا!",
    "عرض المشروع"
   ],
   "new-project-discussion-created-to-customer": [
    "نقاش جديد في المشروع – {project_name}",
    "تم بدء نقاش جديد",
    "تم إنشاء نقاش جديد في المشروع «{project_name}».",
    "فتح النقاش"
   ],
   "new-project-discussion-created-to-staff": [
    "نقاش جديد في المشروع – {project_name}",
    "تم بدء نقاش جديد",
    "تم إنشاء نقاش جديد في المشروع «{project_name}».",
    "فتح النقاش"
   ],
   "new-project-discussion-comment-to-customer": [
    "تعليق جديد على النقاش",
    "تعليق جديد",
    "تم نشر تعليق جديد على نقاش في أحد المشاريع.",
    "فتح النقاش"
   ],
   "new-project-discussion-comment-to-staff": [
    "تعليق جديد على النقاش",
    "تعليق جديد",
    "تم نشر تعليق جديد على نقاش في أحد المشاريع.",
    "فتح النقاش"
   ],
   "new-project-file-uploaded-to-customer": [
    "ملفات جديدة في المشروع – {project_name}",
    "تم رفع ملفات جديدة",
    "تم رفع ملفات جديدة إلى المشروع «{project_name}».",
    "عرض المشروع"
   ],
   "new-project-file-uploaded-to-staff": [
    "ملفات جديدة في المشروع – {project_name}",
    "تم رفع ملفات جديدة",
    "تم رفع ملفات جديدة إلى المشروع «{project_name}».",
    "عرض المشروع"
   ],
   "task-assigned": [
    "تم إسناد مهمة جديدة إليك – {task_name}",
    "تم إسناد مهمة إليك",
    "لديك مهمة جديدة. إليك التفاصيل:",
    "فتح المهمة"
   ],
   "task-added-as-follower": [
    "أنت تتابع مهمة – {task_name}",
    "أصبحت متابعاً",
    "تمت إضافتك كمتابع لهذه المهمة وسيتم إشعارك بالتحديثات.",
    "فتح المهمة"
   ],
   "task-commented": [
    "تعليق جديد على المهمة – {task_name}",
    "تعليق جديد على مهمة",
    "تمت إضافة تعليق على المهمة.",
    "فتح المهمة"
   ],
   "task-commented-to-contacts": [
    "تعليق جديد على المهمة – {task_name}",
    "تعليق جديد على مهمة",
    "تمت إضافة تعليق على المهمة.",
    "فتح المهمة"
   ],
   "task-added-attachment": [
    "مرفق جديد على المهمة – {task_name}",
    "تمت إضافة ملف",
    "قام {task_user_take_action} بإضافة مرفق إلى المهمة.",
    "فتح المهمة"
   ],
   "task-added-attachment-to-contacts": [
    "مرفق جديد على المهمة – {task_name}",
    "تمت إضافة ملف",
    "قام {task_user_take_action} بإضافة مرفق إلى المهمة.",
    "فتح المهمة"
   ],
   "task-deadline-notification": [
    "تذكير بموعد انتهاء المهمة",
    "اقتراب موعد نهائي",
    "المهمة أدناه على وشك الوصول إلى موعدها النهائي.",
    "فتح المهمة"
   ],
   "task-status-change-to-staff": [
    "تم تغيير حالة المهمة",
    "تغيرت حالة مهمة",
    "قام {task_user_take_action} بتغيير حالة مهمة.",
    "فتح المهمة"
   ],
   "task-status-change-to-contacts": [
    "تم تغيير حالة المهمة",
    "تغيرت حالة مهمة",
    "قام {task_user_take_action} بتغيير حالة مهمة.",
    "فتح المهمة"
   ],
   "non-billed-tasks-reminder": [
    "إجراء مطلوب: مهام مكتملة غير مفوترة",
    "مهام غير مفوترة",
    "هذه المهام المكتملة لم يتم تفويترها بعد:",
    ""
   ],
   "new-ticket-opened-admin": [
    "تم فتح تذكرة دعم جديدة",
    "تم فتح تذكرة جديدة",
    "تم فتح تذكرة دعم جديدة.",
    "فتح التذكرة"
   ],
   "ticket-autoresponse": [
    "لقد استلمنا طلب الدعم الخاص بكم",
    "لقد استلمنا طلبكم",
    "تم إنشاء تذكرتكم. سيرد عليكم فريقنا في أقرب وقت ممكن.",
    "عرض التذكرة"
   ],
   "new-ticket-created-staff": [
    "تم إنشاء تذكرة جديدة",
    "تم إنشاء تذكرة جديدة",
    "تم إنشاء تذكرة دعم جديدة.",
    "فتح التذكرة"
   ],
   "ticket-assigned-to-admin": [
    "تم إسناد تذكرة دعم إليك",
    "تم إسناد تذكرة إليك",
    "تم إسناد تذكرة دعم إليك.",
    "فتح التذكرة"
   ],
   "ticket-reply": [
    "رد جديد على تذكرتكم",
    "لقد رددنا على تذكرتكم",
    "يوجد رد جديد على تذكرة الدعم الخاصة بكم.",
    "عرض التذكرة"
   ],
   "ticket-reply-to-admin": [
    "رد جديد على تذكرة دعم",
    "رد أحد العملاء",
    "يوجد رد جديد على تذكرة دعم.",
    "فتح التذكرة"
   ],
   "auto-close-ticket": [
    "تم إغلاق التذكرة تلقائياً",
    "تم إغلاق تذكرتكم",
    "تم إغلاق تذكرتكم تلقائياً لعدم توصلنا بأي رد منكم. يمكنكم الرد في أي وقت لإعادة فتحها.",
    "عرض التذكرة"
   ],
   "new-staff-created": [
    "تمت إضافتك كعضو في الفريق",
    "مرحباً بك في الفريق",
    "تم إنشاء حساب لك. سجّل الدخول بالبيانات أدناه ثم غيّر كلمة المرور.",
    "تسجيل الدخول"
   ],
   "staff-forgot-password": [
    "إنشاء كلمة مرور جديدة",
    "إعادة تعيين كلمة المرور",
    "لقد توصلنا بطلب إعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه لاختيار كلمة مرور جديدة.\nإذا لم تطلب ذلك، يمكنك تجاهل هذا البريد الإلكتروني.",
    "إعادة تعيين كلمة المرور"
   ],
   "staff-password-reseted": [
    "تم تغيير كلمة المرور الخاصة بك",
    "تم تغيير كلمة المرور",
    "تم تغيير كلمة مرور حسابك. إذا لم تكن أنت من قام بذلك، يرجى التواصل مع المسؤول فوراً.",
    ""
   ],
   "two-factor-authentication": [
    "تأكيد تسجيل الدخول",
    "تأكيد تسجيل الدخول",
    "استخدم الرمز أدناه لإتمام تسجيل الدخول. تنتهي صلاحيته خلال دقائق قليلة.",
    ""
   ],
   "reminder-email-staff": [
    "لديك تذكير جديد!",
    "تذكير",
    "طلبت أن يتم تذكيرك بما يلي:",
    "فتح"
   ],
   "event-notification-to-staff": [
    "حدث قادم – {event_title}",
    "اقتراب موعد حدث",
    "هذا تذكير بحدث قادم.",
    "فتح الحدث"
   ],
   "send-request-approve": [
    "الموافقة مطلوبة",
    "موافقتك مطلوبة",
    "هناك عنصر في انتظار موافقتك.",
    "مراجعة"
   ],
   "send_approve": [
    "تمت الموافقة على {object_type}",
    "تمت الموافقة",
    "تمت الموافقة على {object_type} الخاص بك.",
    "عرض"
   ],
   "send_rejected": [
    "تم رفض {object_type}",
    "تم الرفض",
    "تم رفض {object_type} الخاص بك.",
    "عرض"
   ],
   "attendance_notice": [
    "سجلات الحضور – إشعار حضور",
    "إشعار حضور",
    "تم تسجيل إدخال حضور.",
    ""
   ],
   "send_request_approval": [
    "سجلات الحضور – طلب موافقة",
    "طلب موافقة",
    "مرحباً {approver}،\nأرسل {staff_name} طلباً يحتاج إلى موافقتك.",
    "مراجعة الطلب"
   ],
   "remind_user_check_in": [
    "سجلات الحضور – تذكير بتسجيل الحضور",
    "لا تنسَ تسجيل حضورك",
    "هذا تذكير بتسجيل حضورك لبدء نوبة عملك.",
    ""
   ],
   "new_leave_application_send_to_notification_recipient": [
    "سجلات الحضور – طلب إجازة جديد",
    "طلب إجازة جديد",
    "قدّم {staff_name} طلب إجازة.",
    "مراجعة الطلب"
   ],
   "purchase-order-send-to-client": [
    "أمر الشراء {purchase_order_number} من {companyname}",
    "أمر الشراء الخاص بكم",
    "تجدون طيه أمر الشراء {purchase_order_number}. يرجى مراجعته وإبلاغنا إن كان يحتاج إلى أي تعديل.",
    ""
   ],
   "purchase-order-confirmed": [
    "تم تأكيد الطلب {purchase_order_number}",
    "تم تأكيد طلبكم",
    "شكراً لكم. تم تأكيد أمر الشراء {purchase_order_number} ونحن بصدد البدء.",
    ""
   ]
  },
  "rowLabels": {
   "Invoice": "الفاتورة",
   "Status": "الحالة",
   "Due date": "تاريخ الاستحقاق",
   "Amount received": "المبلغ المستلم",
   "Date": "التاريخ",
   "Estimate": "عرض السعر",
   "Company": "الشركة",
   "Client": "العميل",
   "Valid until": "صالح حتى",
   "Form": "النموذج",
   "Email": "البريد الإلكتروني",
   "Request": "الطلب",
   "Proposal": "المقترح",
   "Subject": "الموضوع",
   "Total": "الإجمالي",
   "Open until": "متاح حتى",
   "Contract": "العقد",
   "Start": "البداية",
   "End": "النهاية",
   "Credit note": "إشعار دائن",
   "Order": "الطلب",
   "Subscription": "الاشتراك",
   "Amount": "المبلغ",
   "Invoice status": "حالة الفاتورة",
   "Name": "الاسم",
   "Account": "الحساب",
   "Period": "الفترة",
   "To": "إلى",
   "Balance due": "الرصيد المستحق",
   "Contact": "جهة الاتصال",
   "Lead": "العميل المحتمل",
   "Project": "المشروع",
   "Start date": "تاريخ البداية",
   "Created by": "أنشأه",
   "Discussion": "النقاش",
   "From": "من",
   "Uploaded by": "رفعه",
   "Task": "المهمة",
   "Due": "الاستحقاق",
   "Priority": "الأولوية",
   "New status": "الحالة الجديدة",
   "Ticket": "التذكرة",
   "Department": "القسم",
   "Password": "كلمة المرور",
   "Related to": "متعلق بـ",
   "Event": "الحدث",
   "Starts": "يبدأ",
   "Item": "العنصر",
   "Type": "النوع",
   "Time": "الوقت",
   "Requested by": "طلبه",
   "Employee": "الموظف",
   "Purchase order": "أمر الشراء",
   "Expected delivery": "التسليم المتوقع"
  },
  "fixed": {
   "hello_c": "مرحباً {contact_firstname} {contact_lastname}،",
   "hello_cf": "مرحباً {contact_firstname}،",
   "hello_s": "مرحباً {staff_firstname}،",
   "hello_st": "مرحباً {staff_name}،",
   "regards": "مع أطيب التحيات،",
   "buttonHelp": "إذا لم يعمل الزر، انسخ هذا الرابط في متصفحك:"
  }
 }
}
