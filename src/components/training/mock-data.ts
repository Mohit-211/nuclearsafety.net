export const courses = [
 { id:'NS-101', title:'Nuclear Safety Fundamentals', category:'Core training', description:'Core principles of nuclear safety, defence-in-depth and safe operating limits.', duration:'45 min', modules:6, progress:65, due:'16 Oct 2026', status:'In progress', required:true },
 { id:'NS-102', title:'Radiation Protection Essentials', category:'Radiation protection', description:'Working safely around ionising radiation: dose limits, shielding and monitoring.', duration:'60 min', modules:8, progress:30, due:'23 Oct 2026', status:'In progress', required:true },
 { id:'NS-103', title:'Safety Culture & Human Performance', category:'Safety culture', description:'How individual behaviour and organisational culture shape safety outcomes.', duration:'40 min', modules:5, progress:0, due:'30 Oct 2026', status:'Not started', required:true },
 { id:'NS-104', title:'Emergency Preparedness', category:'Emergency response', description:'Site emergency procedures, alarm response and evacuation roles.', duration:'50 min', modules:7, progress:0, due:'06 Nov 2026', status:'Not started', required:true },
 { id:'NS-100', title:'Introduction to Nuclear Operations', category:'Core training', description:'An overview of how a nuclear power station operates, from reactor to grid.', duration:'30 min', modules:4, progress:100, due:'02 Oct 2026', status:'Completed', required:false },
 { id:'NS-105', title:'Workplace Safety Awareness', category:'Workplace safety', description:'Everyday hazards, personal protective equipment and incident reporting.', duration:'25 min', modules:4, progress:100, due:'28 Sep 2026', status:'Completed', required:false },
];
export const moduleNames = ['Introduction to nuclear safety','Key safety principles','Defence in depth','Roles and responsibilities','Applying safety practices','Monitoring and measurement','Knowledge check','Summary and assessment'];
export function courseModules(course:typeof courses[number]) { return moduleNames.slice(0, course.modules); }
export function statusClass(status:string) { return status === 'Completed' ? 'completed' : status === 'In progress' ? 'progress' : ''; }
export function progressClass(progress:number) { return `p${progress}`; }
