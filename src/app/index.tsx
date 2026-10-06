import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Clock3,
  CheckCircle2,
  Award,
  ArrowRight,
  Play,
  CalendarDays,
  Layers,
  CircleHelp,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/training/app-shell";
import { CourseTable } from "@/components/training/course-table";
import { courses } from "@/components/training/mock-data";
import station from "@/assets/nuclear-station.jpg";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learner Dashboard | nuclearsafety.net" },
      {
        name: "description",
        content:
          "Your nuclear safety training, course progress, and upcoming deadlines.",
      },
      {
        property: "og:title",
        content: "Learner Dashboard | nuclearsafety.net",
      },
      {
        property: "og:description",
        content: "Your nuclear safety learning workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
function Dashboard() {
  const navigate = useNavigate();
  return (
    <AppShell title="Dashboard">
      <div className="page-heading">
        <div>
          <h1>Welcome back, James</h1>
          <p className="subtitle">
            Here’s an overview of your learning and upcoming training.
          </p>
        </div>
        <div className="date-label">
          <CalendarDays size={15} />
          Tuesday, 6 October 2026
        </div>
      </div>
      <div className="stats-grid">
        {[
          {
            label: "Assigned courses",
            value: "6",
            note: "Your current learning plan",
            icon: BookOpen,
            tone: "",
          },
          {
            label: "In progress",
            value: "2",
            note: "Keep your learning moving",
            icon: Clock3,
            tone: "",
          },
          {
            label: "Completed",
            value: "2",
            note: "Courses successfully completed",
            icon: CheckCircle2,
            tone: "success",
          },
          {
            label: "Certificates earned",
            value: "2",
            note: "Available to view and download",
            icon: Award,
            tone: "warning",
          },
        ].map(({ label, value, note, icon: Icon, tone }) => (
          <div className="stat" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={17} />
              </span>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-note">{note}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div>
          <section>
            <div className="section-heading">
              <h2>Continue learning</h2>
              <Link to="/my-training" className="text-link">
                My training <ArrowRight size={14} />
              </Link>
            </div>
            <article className="featured-course">
              <img
                className="course-photo"
                src={station}
                alt="Nuclear power station with cooling towers"
                width={1536}
                height={1024}
              />
              <div className="featured-body">
                <div className="flex items-center justify-between gap-2">
                  <span className="eyebrow">Core training · NS-101</span>
                  <span className="badge progress">In progress</span>
                </div>
                <h3 className="featured-title">Nuclear Safety Fundamentals</h3>
                <div className="course-meta">
                  <span>
                    <Layers size={13} />6 modules
                  </span>
                  <span>
                    <Clock3 size={13} />
                    45 minutes
                  </span>
                </div>
                <div className="progress-label">
                  <span>4 of 6 modules completed</span>
                  <span className="font-semibold text-primary">65%</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Nuclear Safety Fundamentals progress"
                  aria-valuenow={65}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="progress-fill p65" />
                </div>
                <div className="featured-footer">
                  <span className="text-[10px] text-muted-foreground">
                    Next: Roles and responsibilities
                  </span>
                  <Button
                    size="sm"
                    onClick={() =>
                      navigate({
                        to: "/courses/$courseId",
                        params: { courseId: "NS-101" },
                      })
                    }
                  >
                    Resume course <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </article>
          </section>
          <section className="training-section">
            <div className="section-heading">
              <h2>
                My assigned training{" "}
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  4 courses
                </span>
              </h2>
              <Link to="/my-training" className="text-link">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <CourseTable
              items={courses.filter((c) => c.required)}
              onSelect={(c) =>
                navigate({
                  to: "/courses/$courseId",
                  params: { courseId: c.id },
                })
              }
            />
          </section>
          <div className="flex items-center gap-3 mt-5 text-[11px] text-muted-foreground">
            <ShieldCheck size={16} className="text-primary" />
            <span>
              Stay on track. Complete your assigned courses before their due
              dates.
            </span>
          </div>
        </div>
        <aside className="dashboard-aside">
          <section className="side-panel">
            <div className="flex items-center justify-between">
              <h2>Upcoming deadlines</h2>
              <CalendarDays size={16} className="text-muted-foreground" />
            </div>
            <div className="deadline">
              <span className="deadline-icon">
                <Clock3 size={16} />
              </span>
              <div>
                <strong>Nuclear Safety Fundamentals</strong>
                <p>Due 16 October 2026</p>
                <span className="badge due mt-2">10 days remaining</span>
              </div>
            </div>
            <div className="deadline">
              <span className="deadline-icon">
                <Clock3 size={16} />
              </span>
              <div>
                <strong>Radiation Protection Essentials</strong>
                <p>Due 23 October 2026</p>
                <span className="text-[10px] text-muted-foreground block mt-2">
                  17 days remaining
                </span>
              </div>
            </div>
            <div className="panel-divider">
              <Link to="/my-training" className="text-link text-[11px]">
                View training schedule <ArrowRight size={13} />
              </Link>
            </div>
          </section>
          <section className="side-panel">
            <h2>Recent activity</h2>
            <div className="activity-item">
              <span className="activity-icon">
                <CheckCircle2 size={14} />
              </span>
              <div>
                <p>
                  Completed{" "}
                  <strong className="font-medium">
                    Introduction to Nuclear Operations
                  </strong>
                </p>
                <small>2 October 2026</small>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-icon">
                <Award size={14} />
              </span>
              <div>
                <p>
                  Certificate earned for{" "}
                  <strong className="font-medium">
                    Introduction to Nuclear Operations
                  </strong>
                </p>
                <small>2 October 2026</small>
              </div>
            </div>
            <div className="activity-item">
              <span className="activity-icon blue">
                <Play size={12} />
              </span>
              <div>
                <p>
                  Started{" "}
                  <strong className="font-medium">
                    Radiation Protection Essentials
                  </strong>
                </p>
                <small>1 October 2026</small>
              </div>
            </div>
            <div className="panel-divider">
              <Link to="/certificates" className="text-link text-[11px]">
                View my certificates <ArrowRight size={13} />
              </Link>
            </div>
          </section>
          <div className="help-panel">
            <CircleHelp size={21} className="text-primary" />
            <h3>Need a little guidance?</h3>
            <p>
              Find useful documents and reference materials in your resource
              library.
            </p>
            <Link to="/resources" className="text-link text-[11px]">
              Explore resources <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
