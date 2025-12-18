// battle.js - Hàm xếp bài trên tay tự động
class HandLayoutManager {
    constructor() {
        this.cardWidth = 90; // Kích thước mặc định của card
        this.cardHeight = 126;
        this.containerPadding = 30; // Padding của container (15px mỗi bên)
        this.init();
    }

    init() {
        // Tạo hand counter nếu chưa có
        this.createHandCounter();
        // Tạo warning message nếu chưa có
        this.createWarningMessage();
    }

    createHandCounter() {
        const handCards = document.querySelector('.hand-cards');
        if (!handCards) return;

        let counter = handCards.querySelector('.hand-counter');
        if (!counter) {
            counter = document.createElement('div');
            counter.className = 'hand-counter';
            handCards.appendChild(counter);
        }
    }

    createWarningMessage() {
        const handCards = document.querySelector('.hand-cards');
        if (!handCards) return;

        let warning = handCards.querySelector('.hand-warning-message');
        if (!warning) {
            warning = document.createElement('div');
            warning.className = 'hand-warning-message';
            warning.innerHTML = '⚠️ Quá nhiều bài!<br>Sử dụng thanh cuộn để xem';
            handCards.appendChild(warning);
        }
    }

    // Hàm chính để cập nhật layout
    updateHandLayout() {
        const handCards = document.querySelector('.hand-cards');
        if (!handCards) return;

        const cards = handCards.querySelectorAll('.battle-card');
        const cardCount = cards.length;
        const containerWidth = handCards.clientWidth - this.containerPadding;
        
        // Xóa tất cả class layout cũ
        this.removeAllLayoutClasses(handCards);
        
        // Tính toán layout dựa trên số lượng bài và kích thước container
        this.calculateAndApplyLayout(handCards, cards, cardCount, containerWidth);
        
        // Cập nhật counter
        this.updateHandCounter(cardCount);
        
        // Cập nhật warning message
        this.updateWarningMessage(cardCount);
        
        // Áp dụng stacked layout cho card nếu cần
        this.applyCardStackedLayout(cards, cardCount);
    }

    removeAllLayoutClasses(handCards) {
        const layoutClasses = [
            'normal-layout', 'many-cards-layout', 'crowded-layout', 'forced-stacked-layout',
            'many-cards', 'too-many-cards', 'overflow-cards',
            'stacked-layout', 'stacked-mobile'
        ];
        
        layoutClasses.forEach(className => {
            handCards.classList.remove(className);
        });
        
        // Xóa class stacked từ tất cả card
        const cards = handCards.querySelectorAll('.battle-card');
        cards.forEach(card => {
            card.classList.remove('stacked-layout', 'stacked-mobile');
        });
    }

    calculateAndApplyLayout(handCards, cards, cardCount, containerWidth) {
        // Tính toán số card có thể fit vào một hàng
        const maxCardsPerRow = Math.floor(containerWidth / (this.cardWidth + 8)); // +8 là gap mặc định
        
        if (cardCount === 0) {
            handCards.classList.add('normal-layout');
        } else if (cardCount <= 7) {
            // Ít bài: căn giữa với gap lớn
            handCards.classList.add('normal-layout');
        } else if (cardCount <= 12) {
            // Nhiều bài vừa: giảm gap
            handCards.classList.add('many-cards-layout', 'many-cards');
        } else if (cardCount <= 18) {
            // Nhiều bài: giảm gap nhiều hơn
            handCards.classList.add('crowded-layout', 'too-many-cards');
            
            // Nếu không đủ chỗ theo hàng ngang, chuyển sang stacked
            if (cardCount > maxCardsPerRow * 2) { // Giả sử tối đa 2 hàng
                handCards.classList.add('forced-stacked-layout');
            }
        } else {
            // Rất nhiều bài: chuyển sang stacked layout
            handCards.classList.add('forced-stacked-layout', 'overflow-cards');
        }
        
        // Kiểm tra responsive cho mobile
        this.checkMobileLayout(handCards, cardCount);
    }

    checkMobileLayout(handCards, cardCount) {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile && cardCount > 8) {
            handCards.classList.add('stacked-mobile');
        }
    }

    updateHandCounter(cardCount) {
        const counter = document.querySelector('.hand-counter');
        if (!counter) return;

        counter.textContent = `${cardCount} bài`;
        
        // Thêm cảnh báo nếu có nhiều bài
        if (cardCount > 15) {
            counter.classList.add('warning');
        } else {
            counter.classList.remove('warning');
        }
    }

    updateWarningMessage(cardCount) {
        const warning = document.querySelector('.hand-warning-message');
        if (!warning) return;

        if (cardCount > 18) {
            warning.style.display = 'block';
        } else {
            warning.style.display = 'none';
        }
    }

    applyCardStackedLayout(cards, cardCount) {
        const handCards = document.querySelector('.hand-cards');
        const isStacked = handCards.classList.contains('forced-stacked-layout') || 
                         handCards.classList.contains('stacked-mobile');
        
        cards.forEach((card, index) => {
            if (isStacked) {
                card.classList.add(handCards.classList.contains('stacked-mobile') ? 'stacked-mobile' : 'stacked-layout');
                
                // Áp dụng margin-left cho tạo hiệu ứng chồng bài
                if (index > 0) {
                    const overlap = handCards.classList.contains('stacked-mobile') ? -60 : -70;
                    card.style.marginLeft = `${overlap}px`;
                } else {
                    card.style.marginLeft = '0';
                }
            } else {
                card.classList.remove('stacked-layout', 'stacked-mobile');
                card.style.marginLeft = '';
            }
        });
    }

    // Hàm để tính toán lại khi resize window
    setupResizeListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.updateHandLayout();
            }, 250); // Debounce 250ms
        });
    }

    // Hàm để gọi khi có thay đổi về bài (rút bài, đánh bài, etc.)
    onCardsChanged() {
        this.updateHandLayout();
    }
}

// Tạo instance và export để sử dụng
const handLayoutManager = new HandLayoutManager();

// Hàm đơn giản để gọi từ các phần khác của code
function updateBattleHandLayout() {
    handLayoutManager.updateHandLayout();
}

// Thiết lập resize listener
handLayoutManager.setupResizeListener();

// Export để sử dụng trong các module khác
export { handLayoutManager, updateBattleHandLayout };