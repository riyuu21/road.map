from .models import Roadmap, RoadmapEdge, RoadmapNode, SkillLevel

# Curated fallback generator — answers instantly when no AI provider is
# configured or the whole provider chain fails.

NodeSeed = tuple[str, str, str, SkillLevel, str]
EdgeSeed = tuple[str, str]


def _build(topic: str, node_seeds: list[NodeSeed], edge_seeds: list[EdgeSeed]) -> Roadmap:
    nodes = [
        RoadmapNode(id=id, title=title, description=description, level=level, icon=icon)
        for id, title, description, level, icon in node_seeds
    ]
    edges = [
        RoadmapEdge(id=f"{source}->{target}", source=source, target=target)
        for source, target in edge_seeds
    ]
    return Roadmap(topic=topic, nodes=nodes, edges=edges, source="curated")


SYSTEM_DESIGN = _build(
    "System Design",
    [
        ("networks", "Computer Networks", "HTTP, TCP/IP, DNS and how data moves across the wire.", "beginner", "network"),
        ("os", "Operating Systems", "Processes, threads, memory and what the kernel does for you.", "beginner", "cpu"),
        ("databases", "Databases", "Relational modeling, indexes and transactions.", "beginner", "database"),
        ("apis", "APIs & REST", "Resource design, versioning, pagination and idempotency.", "intermediate", "plug"),
        ("caching", "Caching", "Redis, CDNs and the hard problem of invalidation.", "intermediate", "zap"),
        ("load-balancing", "Load Balancing", "Distributing traffic, health checks and failover.", "intermediate", "scale"),
        ("queues", "Message Queues", "Async processing with Kafka and friends.", "intermediate", "layers"),
        ("db-scaling", "Database Scaling", "Replication, sharding and read/write splitting.", "intermediate", "git-branch"),
        ("distributed", "Distributed Systems", "CAP, consensus and designing for partial failure.", "advanced", "globe"),
        ("microservices", "Microservices", "Service boundaries, contracts and orchestration.", "advanced", "boxes"),
        ("observability", "Observability", "Logs, metrics, traces — knowing what production is doing.", "advanced", "activity"),
        ("interviews", "Design Interviews", "Practice whiteboarding real systems end to end.", "advanced", "target"),
    ],
    [
        ("networks", "os"),
        ("os", "databases"),
        ("networks", "apis"),
        ("databases", "caching"),
        ("networks", "load-balancing"),
        ("os", "queues"),
        ("databases", "db-scaling"),
        ("caching", "distributed"),
        ("db-scaling", "distributed"),
        ("load-balancing", "distributed"),
        ("distributed", "microservices"),
        ("apis", "microservices"),
        ("queues", "microservices"),
        ("microservices", "observability"),
        ("microservices", "interviews"),
    ],
)

PYTHON = _build(
    "Python",
    [
        ("syntax", "Syntax & Variables", "Types, operators and the Python mental model.", "beginner", "code"),
        ("control-flow", "Control Flow", "Conditionals, loops and comprehensions.", "beginner", "git-branch"),
        ("data-structures", "Data Structures", "Lists, dicts, sets, tuples — and when to use each.", "beginner", "layers"),
        ("functions", "Functions", "Arguments, scope, closures and decorators.", "beginner", "function-square"),
        ("oop", "Object-Oriented Python", "Classes, dunder methods and composition.", "intermediate", "boxes"),
        ("modules", "Modules & Packages", "Imports, structure and publishing your own.", "intermediate", "package"),
        ("files-errors", "Files & Errors", "I/O, context managers and exception design.", "intermediate", "file-text"),
        ("tooling", "Envs & Tooling", "venv, pip, ruff — a professional setup.", "intermediate", "wrench"),
        ("testing", "Testing", "pytest, fixtures and testable design.", "intermediate", "check-circle"),
        ("async", "Async & Concurrency", "asyncio, threads and the GIL in practice.", "advanced", "zap"),
        ("web-apis", "Web APIs with FastAPI", "Build and ship a typed, documented API.", "advanced", "plug"),
        ("data-libs", "NumPy & Pandas", "The data stack that powers scientific Python.", "advanced", "bar-chart"),
        ("projects", "Projects & Portfolio", "Ship real things — the only proof that matters.", "advanced", "rocket"),
    ],
    [
        ("syntax", "control-flow"),
        ("control-flow", "data-structures"),
        ("control-flow", "functions"),
        ("functions", "oop"),
        ("functions", "modules"),
        ("data-structures", "files-errors"),
        ("modules", "tooling"),
        ("modules", "testing"),
        ("oop", "async"),
        ("tooling", "web-apis"),
        ("testing", "web-apis"),
        ("files-errors", "data-libs"),
        ("web-apis", "projects"),
        ("data-libs", "projects"),
    ],
)

MACHINE_LEARNING = _build(
    "Machine Learning",
    [
        ("python-ml", "Python for ML", "The language and libraries everything builds on.", "beginner", "code"),
        ("linear-algebra", "Linear Algebra", "Vectors, matrices and transformations.", "beginner", "sigma"),
        ("statistics", "Statistics & Probability", "Distributions, inference and uncertainty.", "beginner", "bar-chart"),
        ("preprocessing", "Data Preprocessing", "Cleaning, encoding and splitting data properly.", "beginner", "filter"),
        ("supervised", "Supervised Learning", "Regression, classification and tree ensembles.", "intermediate", "target"),
        ("unsupervised", "Unsupervised Learning", "Clustering and dimensionality reduction.", "intermediate", "scatter-chart"),
        ("evaluation", "Model Evaluation", "Metrics, cross-validation and leakage traps.", "intermediate", "check-circle"),
        ("features", "Feature Engineering", "The craft that often beats bigger models.", "intermediate", "wrench"),
        ("neural-nets", "Neural Networks", "Backprop, activations and optimization.", "advanced", "brain"),
        ("frameworks", "PyTorch & Frameworks", "Training real models on real hardware.", "advanced", "flame"),
        ("nlp", "NLP & Transformers", "Attention, embeddings and modern LLMs.", "advanced", "message-square"),
        ("mlops", "MLOps & Deployment", "Serving, monitoring and retraining in production.", "advanced", "rocket"),
        ("capstone", "Capstone Projects", "End-to-end systems that prove the skill.", "advanced", "trophy"),
    ],
    [
        ("python-ml", "preprocessing"),
        ("statistics", "supervised"),
        ("preprocessing", "supervised"),
        ("statistics", "unsupervised"),
        ("supervised", "evaluation"),
        ("preprocessing", "features"),
        ("linear-algebra", "neural-nets"),
        ("evaluation", "neural-nets"),
        ("neural-nets", "frameworks"),
        ("frameworks", "nlp"),
        ("evaluation", "mlops"),
        ("nlp", "capstone"),
        ("mlops", "capstone"),
    ],
)

PRESETS = {
    "system design": SYSTEM_DESIGN,
    "python": PYTHON,
    "machine learning": MACHINE_LEARNING,
}


def display_topic(raw: str) -> str:
    """Title-case a free-form topic for display."""
    return " ".join(w[0].upper() + w[1:] if len(w) > 2 else w for w in raw.strip().split())


def _generic(raw_topic: str) -> Roadmap:
    topic = display_topic(raw_topic)
    return _build(
        topic,
        [
            ("fundamentals", f"{topic} Fundamentals", "Core vocabulary and the lay of the land.", "beginner", "book-open"),
            ("concepts", "Core Concepts", "The ideas every practitioner leans on daily.", "beginner", "lightbulb"),
            ("setup", "Tooling & Setup", "A working environment you actually understand.", "beginner", "wrench"),
            ("practice", "Hands-on Practice", "Small, finished exercises beat big, abandoned ones.", "intermediate", "keyboard"),
            ("patterns", "Intermediate Patterns", "The techniques that separate users from builders.", "intermediate", "layers"),
            ("ecosystem", "Ecosystem & Libraries", "Standing on the right shoulders.", "intermediate", "package"),
            ("projects", "Real-world Projects", "Build something with users other than you.", "advanced", "rocket"),
            ("advanced", "Advanced Topics", "The deep end — internals, scale and edge cases.", "advanced", "brain"),
            ("best-practices", "Best Practices", "Testing, security and maintainability.", "advanced", "shield"),
            ("mastery", "Mastery & Specialization", "Pick a niche and go deeper than anyone around you.", "advanced", "trophy"),
        ],
        [
            ("fundamentals", "concepts"),
            ("fundamentals", "setup"),
            ("concepts", "practice"),
            ("setup", "practice"),
            ("practice", "patterns"),
            ("practice", "ecosystem"),
            ("patterns", "projects"),
            ("ecosystem", "projects"),
            ("patterns", "advanced"),
            ("projects", "best-practices"),
            ("advanced", "mastery"),
            ("best-practices", "mastery"),
        ],
    )


def generate_roadmap(topic: str) -> Roadmap:
    preset = PRESETS.get(topic.strip().lower())
    return preset.model_copy(deep=True) if preset else _generic(topic)
