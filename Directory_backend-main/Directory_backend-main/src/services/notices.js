// Short emails to people about decisions that affect them. A mail problem never blocks the action that triggered it.
export const emailPerson = (mailer, person, subject, lines) => {
  if (!mailer || !person?.email || person.notificationPreferences?.email === false) return undefined;
  return mailer.send({ to: person.email, subject, text: lines.filter((line) => line !== undefined && line !== null).join('\n') }).catch(() => console.error('Notice email could not be sent'));
};
export const dashboardUrl = (config) => `${config?.CLIENT_URL || ''}/business-owner`;
