export const themeOptions = [
    {
        value: 'light',
        label: 'Pastel nha khoa',
        description: 'Xanh pastel sạch, đang dùng mặc định.',
        swatches: ['#A8DADC', '#CDEFEA', '#4A6FA5']
    },
    {
        value: 'mint',
        label: 'Mint dịu',
        description: 'Màu xanh mint nhẹ, mềm và thân thiện.',
        swatches: ['#B8EAD9', '#DDF8EF', '#2F8F7B']
    },
    {
        value: 'ocean',
        label: 'Ocean xanh',
        description: 'Xanh phòng khám rõ nét, CTA nổi hơn.',
        swatches: ['#B9DDF8', '#EAF6FF', '#2F6FAE']
    },
    {
        value: 'lavender',
        label: 'Lavender sạch',
        description: 'Tông tím xanh rất nhẹ, hiện đại hơn.',
        swatches: ['#C9C7F6', '#F1F0FF', '#5F62A8']
    },
    {
        value: 'rose',
        label: 'Rose ấm',
        description: 'Hồng pastel nhẹ, hợp trang chăm sóc khách.',
        swatches: ['#FFD6E0', '#FFF3F6', '#B95F77']
    },
    {
        value: 'navy',
        label: 'Navy chuyên nghiệp',
        description: 'Xanh navy nhẹ, chắc và tin cậy.',
        swatches: ['#B8D4E8', '#EFF7FB', '#345F86']
    }
];

export const isValidTheme = (theme) => themeOptions.some((item) => item.value === theme);

export const applyTheme = (theme) => {
    const nextTheme = isValidTheme(theme) ? theme : 'light';
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('phenikaa-theme', nextTheme);
    return nextTheme;
};

export const getStoredTheme = () => {
    const storedTheme = window.localStorage.getItem('phenikaa-theme');
    return isValidTheme(storedTheme) ? storedTheme : 'light';
};
