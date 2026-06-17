import { useEffect } from 'react';

export default function Seo({ title = 'Phenikaa Dental', description = 'Đặt lịch và quản lý nha khoa Phenikaa Dental.' }) {
    useEffect(() => {
        document.title = title;

        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('name', 'description');
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', description);

        let ogTitle = document.querySelector('meta[property="og:title"]');
        if (!ogTitle) {
            ogTitle = document.createElement('meta');
            ogTitle.setAttribute('property', 'og:title');
            document.head.appendChild(ogTitle);
        }
        ogTitle.setAttribute('content', title);
    }, [title, description]);

    return null;
}
