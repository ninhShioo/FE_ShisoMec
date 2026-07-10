const paths = {
    bell: (
        <>
            <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V4a2 2 0 1 0-4 0v1.3A6 6 0 0 0 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
            <path d="M9 17a3 3 0 0 0 6 0" />
        </>
    ),
    calendarClock: (
        <>
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <path d="M3 10h18" />
            <path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M12 14v3l2 1" />
        </>
    ),
    userCheck: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="4" />
            <path d="m16 11 2 2 4-4" />
        </>
    ),
    userX: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="4" />
            <path d="m17 8 4 4" />
            <path d="m21 8-4 4" />
        </>
    ),
    userCog: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
            <circle cx="9.5" cy="7" r="4" />
            <circle cx="18" cy="11" r="2" />
            <path d="M18 7v1" />
            <path d="M18 14v1" />
            <path d="m14.5 9 .9.5" />
            <path d="m20.6 12.5.9.5" />
            <path d="m14.5 13 .9-.5" />
            <path d="m20.6 9.5.9-.5" />
        </>
    ),
    eye: (
        <>
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    check: <path d="m5 13 4 4L19 7" />,
    x: (
        <>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </>
    ),
    play: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="m10 8 6 4-6 4V8Z" />
        </>
    ),
    fileText: (
        <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h5" />
        </>
    ),
    receipt: (
        <>
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
            <path d="M8 15h5" />
        </>
    ),
    wallet: (
        <>
            <path d="M3 7a2 2 0 0 1 2-2h14v14H5a2 2 0 0 1-2-2Z" />
            <path d="M16 12h4" />
            <path d="M16 12a1 1 0 1 0 0 .01" />
        </>
    ),
    qr: (
        <>
            <path d="M4 4h6v6H4Z" />
            <path d="M14 4h6v6h-6Z" />
            <path d="M4 14h6v6H4Z" />
            <path d="M14 14h2v2h-2Z" />
            <path d="M18 14h2v6h-4v-2h2Z" />
        </>
    )
};

export default function Icon({ name, className = 'h-4 w-4' }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
        >
            {paths[name] || paths.eye}
        </svg>
    );
}
