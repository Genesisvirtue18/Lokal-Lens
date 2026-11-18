// Small brand marks for contact and social fields (simple shapes, drawn in currentColor).
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export const InstagramIcon = (props) => <svg {...base} {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></svg>;
export const FacebookIcon = (props) => <svg {...base} {...props}><circle cx="12" cy="12" r="9.5" /><path d="M13.5 20.5v-7h2.4l.4-2.8h-2.8V9.1c0-.8.3-1.3 1.4-1.3h1.5V5.3c-.3 0-1.1-.1-2.1-.1-2.2 0-3.6 1.3-3.6 3.7v2H8.3v2.8h2.4v7" /></svg>;
export const YoutubeIcon = (props) => <svg {...base} {...props}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" /></svg>;
export const WhatsappIcon = (props) => <svg {...base} {...props}><path d="M3.5 20.5 4.9 16A8.5 8.5 0 1 1 8 19.2z" /><path d="M9 8.8c0 3.2 3 6.2 6.2 6.2l1-1.4-2-1-.9.7c-.8-.3-1.9-1.4-2.2-2.2l.7-.9-1-2z" fill="currentColor" stroke="none" /></svg>;
