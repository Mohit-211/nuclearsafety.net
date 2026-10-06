/** Data the server passes to the learner/admin chrome (client components). */
export type ShellNotification = { title: string; detail: string; tone: 'due' | 'done' | 'info' };

export type ShellUser = {
  name: string;
  email: string;
  initials: string;
  roleLabel: string;
  isAdmin: boolean;
  organizationName: string | null;
};

export type ShellSupport = { email: string; message: string };
