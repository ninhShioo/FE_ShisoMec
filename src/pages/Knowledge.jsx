const articles = [
    ['Khi nào nên cạo vôi răng?', 'Nên kiểm tra và làm sạch răng định kỳ 6 tháng/lần để giảm mảng bám và viêm nướu.'],
    ['Niềng răng cần chuẩn bị gì?', 'Bác sĩ sẽ đánh giá khớp cắn, chụp phim và tư vấn phương án phù hợp trước khi bắt đầu.'],
    ['Tẩy trắng răng có đau không?', 'Cảm giác ê nhẹ có thể xuất hiện tạm thời, nhưng quy trình đúng giúp giảm khó chịu.'],
    ['Implant phù hợp với ai?', 'Người mất răng cần được kiểm tra xương hàm và sức khỏe toàn thân trước khi chỉ định.']
];

export default function Knowledge() {
    return (
        <main className="min-h-screen bg-[#f7fbff]">
            <section className="bg-white">
                <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                    <p className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-black uppercase text-blue-700">Kiến thức nha khoa</p>
                    <h1 className="mt-5 max-w-3xl text-4xl font-black text-blue-950 sm:text-5xl">Thông tin cơ bản trước khi điều trị</h1>
                    <p className="mt-4 max-w-3xl leading-8 text-slate-600">Các bài viết ngắn giúp khách hàng hiểu dịch vụ trước khi đặt lịch tư vấn.</p>
                </div>
            </section>

            <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
                {articles.map(([title, body]) => (
                    <article key={title} className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm shadow-blue-50">
                        <p className="text-xs font-black uppercase text-blue-700">Hướng dẫn</p>
                        <h2 className="mt-2 text-2xl font-black text-blue-950">{title}</h2>
                        <p className="mt-4 leading-7 text-slate-600">{body}</p>
                    </article>
                ))}
            </section>
        </main>
    );
}
