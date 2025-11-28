// 全局变量
let currentQuestion = 0;
let answers = [];
let scores = {
    D: 0,   // Dominant 支配者
    S: 0,   // Submissive 顺从者
    Sa: 0,  // Sadist 施虐者
    M: 0,   // Masochist 受虐者
    Sw: 0   // Switch 切换者
};

// 页面加载时检查是否有保存的数据
window.addEventListener('DOMContentLoaded', () => {
    const savedAnswers = localStorage.getItem('bdsmTestAnswers');
    const savedScores = localStorage.getItem('bdsmTestScores');
    const savedQuestion = localStorage.getItem('bdsmTestCurrentQuestion');

    if (savedScores) {
        // 如果有保存的结果，直接显示结果页面
        try {
            scores = JSON.parse(savedScores);
            showPage('result-page');
            showResults();
        } catch (e) {
            console.error('���复结果失败:', e);
            localStorage.clear();
        }
    } else if (savedAnswers && savedQuestion) {
        // 如果有保存的答题进度，恢复到测试页面
        try {
            answers = JSON.parse(savedAnswers);
            currentQuestion = parseInt(savedQuestion);
            showPage('test-page');
            displayQuestion();
        } catch (e) {
            console.error('恢复进度失败:', e);
            localStorage.clear();
        }
    }
});

// 页面切换
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// 开始测试
function startTest() {
    currentQuestion = 0;
    answers = [];
    scores = { D: 0, S: 0, Sa: 0, M: 0, Sw: 0 };
    // 清除之前保存的数据
    localStorage.removeItem('bdsmTestAnswers');
    localStorage.removeItem('bdsmTestScores');
    localStorage.removeItem('bdsmTestCurrentQuestion');
    showPage('test-page');
    displayQuestion();
}

// 显示问题
function displayQuestion() {
    const question = questions[currentQuestion];
    document.getElementById('question').textContent = question.question;
    document.getElementById('q-num').textContent = currentQuestion + 1;

    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option.text;
        optionDiv.onclick = () => selectOption(index);

        if (answers[currentQuestion] === index) {
            optionDiv.classList.add('selected');
        }

        optionsContainer.appendChild(optionDiv);
    });

    updateProgress();
    updateNavigation();
}

// 选择选项
function selectOption(optionIndex) {
    answers[currentQuestion] = optionIndex;

    // 保存答题进度到localStorage
    localStorage.setItem('bdsmTestAnswers', JSON.stringify(answers));
    localStorage.setItem('bdsmTestCurrentQuestion', currentQuestion.toString());

    // 更新UI
    document.querySelectorAll('.option').forEach((opt, idx) => {
        opt.classList.toggle('selected', idx === optionIndex);
    });

    updateNavigation();
}

// 更新进度
function updateProgress() {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('progress-text').textContent = `${currentQuestion + 1}/${questions.length}`;
}

// 更新导航按钮
function updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.disabled = currentQuestion === 0;
    nextBtn.disabled = answers[currentQuestion] === undefined;

    if (currentQuestion === questions.length - 1) {
        nextBtn.textContent = '查看结果';
    } else {
        nextBtn.textContent = '下一题';
    }
}

// 上一题
function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        // 保存当前进度
        localStorage.setItem('bdsmTestCurrentQuestion', currentQuestion.toString());
        displayQuestion();
    }
}

// 下一题
function nextQuestion() {
    if (answers[currentQuestion] === undefined) {
        return;
    }

    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        // 保存当前进度
        localStorage.setItem('bdsmTestCurrentQuestion', currentQuestion.toString());
        displayQuestion();
    } else {
        calculateResults();
        showResults();
    }
}

// 计算结果
function calculateResults() {
    // 重置分数
    scores = { D: 0, S: 0, Sa: 0, M: 0, Sw: 0 };

    // 计算每个维度的分数
    answers.forEach((answerIndex, questionIndex) => {
        const question = questions[questionIndex];
        const selectedOption = question.options[answerIndex];

        Object.keys(selectedOption.scores).forEach(dimension => {
            scores[dimension] += selectedOption.scores[dimension];
        });
    });

    // 找出得分最高的维度
    const sortedDimensions = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const maxScore = sortedDimensions[0][1];
    const secondMaxScore = sortedDimensions[1] ? sortedDimensions[1][1] : 0;

    // 激进加成：如果最高分高于第二名30%以上，直接翻倍
    if (maxScore > 0 && secondMaxScore > 0) {
        const ratio = maxScore / secondMaxScore;
        if (ratio > 1.3) {
            // 给最高分维度翻倍加成
            const topDimension = sortedDimensions[0][0];
            scores[topDimension] = maxScore * 2.5; // 直接2.5倍
        }
    }

    // 激进过滤：低于最高分25%的直接清零
    const newMaxScore = Math.max(...Object.values(scores));
    Object.keys(scores).forEach(dimension => {
        if (scores[dimension] < newMaxScore * 0.25) {
            scores[dimension] = 0;
        }
    });

    // 计算总分
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    // 转换为百分比
    Object.keys(scores).forEach(dimension => {
        scores[dimension] = totalScore > 0 ? (scores[dimension] / totalScore * 100) : 0;
        // 四舍五入到整数
        scores[dimension] = Math.round(scores[dimension]);
    });

    // 确保总和为100%（处理四舍五入误差）
    const currentTotal = Object.values(scores).reduce((a, b) => a + b, 0);
    if (currentTotal !== 100 && currentTotal > 0) {
        const diff = 100 - currentTotal;
        // 将差值加到得分最高的维度上
        const maxDimension = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
        scores[maxDimension] += diff;
    }

    // 保存最终结果到localStorage
    localStorage.setItem('bdsmTestScores', JSON.stringify(scores));
    // 清除答题进度（因为已经完成测试）
    localStorage.removeItem('bdsmTestAnswers');
    localStorage.removeItem('bdsmTestCurrentQuestion');
}

// 显示结果
function showResults() {
    showPage('result-page');

    // 排序结果
    const sortedScores = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0);

    // 生成结果图表
    displayResultChart(sortedScores);

    // 显示详细结果
    displayResultDetails(sortedScores);
}

// 显示结果图表
function displayResultChart(sortedScores) {
    const chartContainer = document.getElementById('result-chart');
    chartContainer.innerHTML = '<h2 style="margin-bottom: 24px; color: var(--dark-gray);">你的BDSM倾向分析</h2>';

    const canvas = document.createElement('canvas');
    canvas.id = 'radar-chart';
    canvas.style.maxWidth = '100%';
    canvas.style.height = '400px';
    chartContainer.appendChild(canvas);

    // 使用简单的SVG雷达图
    drawRadarChart(sortedScores);
}

// 绘制雷达图（简化版）
function drawRadarChart(sortedScores) {
    const chartContainer = document.getElementById('result-chart');
    const canvas = document.getElementById('radar-chart');

    // 移除canvas，使用SVG
    canvas.remove();

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '400');
    svg.setAttribute('viewBox', '0 0 400 400');

    const centerX = 200;
    const centerY = 200;
    const maxRadius = 150;

    // 绘制背景圆圈
    for (let i = 1; i <= 5; i++) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', centerX);
        circle.setAttribute('cy', centerY);
        circle.setAttribute('r', (maxRadius / 5) * i);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#F5F5F7');
        circle.setAttribute('stroke-width', '1');
        svg.appendChild(circle);
    }

    // 绘制数据 - 按照Switch在顶部的顺序排列
    const dimensions = ['Sw', 'M', 'S', 'D', 'Sa'];
    const angleStep = (Math.PI * 2) / dimensions.length;

    // 英文简写标签映射
    const labelMap = {
        'Sw': 'Switch',
        'M': 'M',
        'S': 'Sub',
        'D': 'Dom',
        'Sa': 'S'
    };

    // 绘制轴线和标签
    dimensions.forEach((dim, index) => {
        const angle = angleStep * index - Math.PI / 2;
        const x = centerX + Math.cos(angle) * maxRadius;
        const y = centerY + Math.sin(angle) * maxRadius;

        // 轴线
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', centerX);
        line.setAttribute('y1', centerY);
        line.setAttribute('x2', x);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#E5E5E7');
        line.setAttribute('stroke-width', '1');
        svg.appendChild(line);

        // 标签 - 使用英文简写
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        const labelX = centerX + Math.cos(angle) * (maxRadius + 20);
        const labelY = centerY + Math.sin(angle) * (maxRadius + 20);
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#1D1D1F');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', '600');
        text.textContent = labelMap[dim];
        svg.appendChild(text);
    });

    // 绘制数据多边形
    let points = '';
    dimensions.forEach((dim, index) => {
        const angle = angleStep * index - Math.PI / 2;
        const score = scores[dim] || 0;

        // 优化：确保即使低分也有一定面积，最低30%半径
        // 高分时完全到达边缘
        const minRadiusPercent = 0.3; // 最小30%半径
        const adjustedScore = minRadiusPercent + (score / 100) * (1 - minRadiusPercent);
        const radius = adjustedScore * maxRadius;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        points += `${x},${y} `;
    });

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points);
    polygon.setAttribute('fill', 'rgba(249, 76, 140, 0.25)');
    polygon.setAttribute('stroke', '#F94C8C');
    polygon.setAttribute('stroke-width', '2.5');
    svg.appendChild(polygon);

    // 绘制数据点
    dimensions.forEach((dim, index) => {
        const angle = angleStep * index - Math.PI / 2;
        const score = scores[dim] || 0;

        const minRadiusPercent = 0.3;
        const adjustedScore = minRadiusPercent + (score / 100) * (1 - minRadiusPercent);
        const radius = adjustedScore * maxRadius;

        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#F94C8C');
        circle.setAttribute('stroke', '#FFFFFF');
        circle.setAttribute('stroke-width', '2');
        svg.appendChild(circle);
    });

    chartContainer.appendChild(svg);
}

// 显示详细结果
function displayResultDetails(sortedScores) {
    const detailsContainer = document.getElementById('result-details');
    detailsContainer.innerHTML = '';

    // 性格组成部分
    const personalitySection = document.createElement('div');
    personalitySection.className = 'result-section';
    personalitySection.innerHTML = `
        <h2 class="section-title-result">详细性格组成</h2>
        <p class="section-subtitle">点击具体名词可查看性格说明</p>
        <div class="personality-grid" id="personality-grid"></div>
        <button class="view-all-btn" id="personality-view-all" onclick="togglePersonalityDetails()">
            <span>查看全部</span>
            <svg class="icon icon-xs chevron"><use href="#icon-arrow-right"/></svg>
        </button>
        <div class="personality-details hidden" id="personality-details"></div>
    `;
    detailsContainer.appendChild(personalitySection);

    // 只显示前3个性格
    const personalityGrid = document.getElementById('personality-grid');
    const top3Personalities = sortedScores.slice(0, 3);

    top3Personalities.forEach(([dimension, score]) => {
        const desc = resultDescriptions[dimension];
        const iconMap = {
            'D': 'dominant',
            'S': 'submissive',
            'Sa': 'sadist',
            'M': 'masochist',
            'Sw': 'switch'
        };

        const item = document.createElement('div');
        item.className = 'trait-item';
        item.innerHTML = `
            <div class="trait-icon-circle">
                <svg class="icon icon-trait"><use href="#icon-${iconMap[dimension]}"/></svg>
            </div>
            <div class="trait-name">${desc.name.split(' ')[0]}</div>
            <div class="trait-percent">${score.toFixed(0)}%</div>
        `;
        item.onclick = () => showPersonalityDetail(dimension, desc, score);
        personalityGrid.appendChild(item);
    });

    // 玩法推荐部分
    const playsSection = document.createElement('div');
    playsSection.className = 'result-section';
    playsSection.innerHTML = `
        <h2 class="section-title-result">可能喜欢的玩法</h2>
        <p class="section-subtitle">点击具体名词可查看玩法说明</p>
        <div class="plays-grid" id="plays-grid"></div>
        <button class="view-all-btn" id="plays-view-all" onclick="togglePlaysDetails()">
            <span>查看全部</span>
            <svg class="icon icon-xs chevron"><use href="#icon-arrow-right"/></svg>
        </button>
        <div class="plays-details hidden" id="plays-details"></div>
    `;
    detailsContainer.appendChild(playsSection);

    // 只显示前3个玩法（来自最高分的维度）
    const playsGrid = document.getElementById('plays-grid');
    const topDimension = sortedScores[0][0];
    const topPlays = resultDescriptions[topDimension].plays.slice(0, 3);

    // 玩法图标映射
    const playIconMap = {
        '24/7': '24-7',
        '恋痛': 'pain',
        '露出': 'exhibition',
        '绳缚': 'bondage',
        '权力': 'dominant',
        '服从': 'submissive',
        '鞭打': 'sadist',
        '痛感': 'masochist',
        '切换': 'switch'
    };

    // 根据玩法名称选择图标
    function getPlayIcon(playName) {
        for (const [key, icon] of Object.entries(playIconMap)) {
            if (playName.includes(key)) {
                return icon;
            }
        }
        // 默认使用所属维度的图标
        const dimensionIcons = {
            'D': 'dominant',
            'S': 'submissive',
            'Sa': 'sadist',
            'M': 'masochist',
            'Sw': 'switch'
        };
        return dimensionIcons[topDimension] || 'heart';
    }

    topPlays.forEach((play, index) => {
        const item = document.createElement('div');
        item.className = 'trait-item';
        const iconName = getPlayIcon(play);

        item.innerHTML = `
            <div class="trait-icon-circle">
                <svg class="icon icon-trait"><use href="#icon-${iconName}"/></svg>
            </div>
            <div class="trait-name">${play}</div>
            <div class="trait-percent">100%</div>
        `;
        playsGrid.appendChild(item);
    });

    // 添加总结
    addResultSummary(detailsContainer, sortedScores);
}

// 显示性格详情弹窗
function showPersonalityDetail(dimension, desc, score) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            <h3 class="modal-title">${desc.name}</h3>
            <div class="modal-score">${score.toFixed(1)}%</div>
            <p class="modal-desc">${desc.fullDesc}</p>
            <div class="modal-traits">
                ${desc.traits.map(trait =>
                    `<span class="trait-tag">${trait}</span>`
                ).join('')}
            </div>
            <p class="modal-suggestion"><strong>建议：</strong>${desc.suggestions}</p>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => modal.classList.add('active'), 10);

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };
}

// 切换性格详情展开
function togglePersonalityDetails() {
    const details = document.getElementById('personality-details');
    const btn = document.getElementById('personality-view-all');
    const chevron = btn.querySelector('.chevron');

    if (details.classList.contains('hidden')) {
        // 展开 - 显示所有性格详细信息
        details.classList.remove('hidden');
        btn.querySelector('span').textContent = '收起';
        chevron.style.transform = 'rotate(90deg)';

        const sortedScores = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, score]) => score > 0);

        details.innerHTML = '';
        sortedScores.forEach(([dimension, score]) => {
            const desc = resultDescriptions[dimension];
            const detailCard = document.createElement('div');
            detailCard.className = 'detail-card';
            detailCard.innerHTML = `
                <div class="detail-header">
                    <h4>${desc.name}</h4>
                    <span class="detail-score">${score.toFixed(1)}%</span>
                </div>
                <div class="detail-bar">
                    <div class="detail-bar-fill" style="width: ${score}%"></div>
                </div>
                <p class="detail-desc">${desc.fullDesc}</p>
                <div class="detail-plays">
                    <strong>推荐玩法：</strong>
                    ${desc.plays.slice(0, 5).map(play =>
                        `<span class="play-tag">${play}</span>`
                    ).join('')}
                </div>
            `;
            details.appendChild(detailCard);
        });
    } else {
        // 收起
        details.classList.add('hidden');
        btn.querySelector('span').textContent = '查看全部';
        chevron.style.transform = 'rotate(0deg)';
    }
}

// 切换玩法详情展开
function togglePlaysDetails() {
    const details = document.getElementById('plays-details');
    const btn = document.getElementById('plays-view-all');
    const chevron = btn.querySelector('.chevron');

    if (details.classList.contains('hidden')) {
        // 展开 - 显示所有玩法（使用柱状图）
        details.classList.remove('hidden');
        btn.querySelector('span').textContent = '收起';
        chevron.style.transform = 'rotate(90deg)';

        const sortedScores = Object.entries(scores)
            .sort((a, b) => b[1] - a[1])
            .filter(([_, score]) => score > 0);

        details.innerHTML = '';

        // 按照每个维度分组显示玩法
        sortedScores.forEach(([dimension, score]) => {
            const desc = resultDescriptions[dimension];

            // 为每个维度创建一个分组
            const dimensionSection = document.createElement('div');
            dimensionSection.className = 'plays-dimension-section';
            dimensionSection.innerHTML = `
                <h4 class="dimension-section-title">${desc.name.split(' ')[0]} 相关玩法</h4>
            `;

            // 创建玩法列表容器
            const playsContainer = document.createElement('div');
            playsContainer.className = 'plays-bars-container';

            desc.plays.forEach(play => {
                const playBar = document.createElement('div');
                playBar.className = 'play-bar-item';

                // 根据该维度的得分计算玩法的推荐度
                const playScore = score;

                playBar.innerHTML = `
                    <div class="play-bar-header">
                        <span class="play-bar-name">${play}</span>
                        <span class="play-bar-score">${playScore.toFixed(0)}%</span>
                    </div>
                    <div class="play-bar-bg">
                        <div class="play-bar-fill" style="width: ${playScore}%"></div>
                    </div>
                `;

                playsContainer.appendChild(playBar);
            });

            dimensionSection.appendChild(playsContainer);
            details.appendChild(dimensionSection);
        });
    } else {
        // 收起
        details.classList.add('hidden');
        btn.querySelector('span').textContent = '查看全部';
        chevron.style.transform = 'rotate(0deg)';
    }
}

// 添加总结
function addResultSummary(container, sortedScores) {
    const summary = document.createElement('div');
    summary.className = 'result-summary-card';

    const topDimension = sortedScores[0];
    const topDesc = resultDescriptions[topDimension[0]];

    summary.innerHTML = `
        <h3 class="summary-title">你的主要倾向</h3>
        <p class="summary-text">
            根据测试结果，你的主要倾向是<strong>${topDesc.name}</strong>（${topDimension[1].toFixed(1)}%）。
            ${topDesc.shortDesc}。请记住，这只是一个参考，真实的你可能更加复杂和多面。
            在任何亲密关系中，<strong>沟通、尊重和明确的同意</strong>都是最重要的。
        </p>
    `;

    container.appendChild(summary);
}

// 保存结果
function saveResult() {
    const resultText = generateResultText();

    // 创建下载
    const blob = new Blob([resultText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'BDSM测试结果.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // 显示提示
    showNotification('结果已保存到本地');
}

// 辅助函数：将SVG symbol转换为base64 data URL
function svgSymbolToDataUrl(symbolElement) {
    if (!symbolElement) return null;

    // 创建完整的SVG
    const viewBox = symbolElement.getAttribute('viewBox') || '0 0 48 48';
    const svgContent = Array.from(symbolElement.children).map(child => {
        const cloned = child.cloneNode(true);
        // 设置粉色
        if (cloned.hasAttribute('stroke') && cloned.getAttribute('stroke') === 'currentColor') {
            cloned.setAttribute('stroke', '#F94C8C');
        }
        if (cloned.hasAttribute('fill') && cloned.getAttribute('fill') === 'currentColor') {
            cloned.setAttribute('fill', '#F94C8C');
        }
        return cloned.outerHTML;
    }).join('');

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="32" height="32">${svgContent}</svg>`;
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    return `data:image/svg+xml;base64,${base64}`;
}

// 下载结果图片
function downloadResultImage() {
    // 显示加载提示
    showNotification('正在生成图片...');

    const resultContent = document.querySelector('.result-content');

    // 暂时隐藏操作按钮，避免在截图中显示
    const actionButtons = document.querySelector('.result-actions');
    const originalDisplay = actionButtons.style.display;
    actionButtons.style.display = 'none';

    // 创建一个临时容器用于导出
    const exportContainer = document.createElement('div');
    exportContainer.style.cssText = `
        position: fixed;
        top: -10000px;
        left: 0;
        width: 680px;
        background: linear-gradient(135deg, #FFF1F5 0%, #FFFFFF 100%);
        padding: 48px 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    `;

    // 克隆内容
    const clonedContent = resultContent.cloneNode(true);

    // 移除操作按钮
    const clonedActions = clonedContent.querySelector('.result-actions');
    if (clonedActions) {
        clonedActions.remove();
    }

    // 获取原始SVG定义
    const originalSvgDefs = document.querySelector('svg[style*="display: none"]');

    // 替换所有使用 SVG use 的图标为 img 标签，使用 base64 data URL
    const allSvgs = clonedContent.querySelectorAll('svg');
    allSvgs.forEach(svg => {
        const use = svg.querySelector('use');
        if (use && originalSvgDefs) {
            const href = use.getAttribute('href') || use.getAttribute('xlink:href');
            if (href) {
                const iconId = href.replace('#', '');
                const symbolElement = originalSvgDefs.querySelector(`#${iconId}`);

                if (symbolElement) {
                    // 转换为base64 data URL
                    const dataUrl = svgSymbolToDataUrl(symbolElement);

                    if (dataUrl) {
                        // 创建img标签替换svg
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        img.style.cssText = 'width: 32px; height: 32px; display: inline-block; vertical-align: middle;';

                        // 复制svg的class以保持样式
                        if (svg.className.baseVal) {
                            img.className = svg.className.baseVal;
                        }

                        svg.replaceWith(img);
                    }
                }
            }
        }
    });

    // 强制设置所有文字颜色为深色，移除所有半透明效果
    const allTextElements = clonedContent.querySelectorAll('*');
    allTextElements.forEach(el => {
        const tagName = el.tagName.toLowerCase();
        const computed = window.getComputedStyle(el);

        // 强制移除所有可能导致半透明的属性
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('filter', 'none', 'important');
        el.style.setProperty('-webkit-filter', 'none', 'important');

        // 强制设置标题和重要文字为深色 - 使用更强的选择器
        if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4') {
            el.style.setProperty('color', '#1F2937', 'important');
            el.style.setProperty('font-weight', '600', 'important');
            el.style.setProperty('opacity', '1', 'important');
            el.style.setProperty('-webkit-text-fill-color', '#1F2937', 'important');
            el.style.setProperty('background-clip', 'border-box', 'important');
            el.style.setProperty('-webkit-background-clip', 'border-box', 'important');
        }

        if (el.classList.contains('title')) {
            el.style.setProperty('color', '#1F2937', 'important');
            el.style.setProperty('font-weight', '700', 'important');
            el.style.setProperty('opacity', '1', 'important');
            // 清除渐变文字效果
            el.style.setProperty('-webkit-text-fill-color', '#1F2937', 'important');
            el.style.setProperty('background', 'none', 'important');
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('background-clip', 'border-box', 'important');
            el.style.setProperty('-webkit-background-clip', 'border-box', 'important');
        }

        if (el.classList.contains('section-title-result') ||
            el.classList.contains('summary-title') ||
            el.classList.contains('dimension-section-title')) {
            el.style.setProperty('color', '#1F2937', 'important');
            el.style.setProperty('font-weight', '600', 'important');
            el.style.setProperty('opacity', '1', 'important');
            el.style.setProperty('-webkit-text-fill-color', '#1F2937', 'important');
        }

        if (el.classList.contains('trait-name') ||
            el.classList.contains('play-bar-name') ||
            el.classList.contains('detail-header') ||
            el.classList.contains('section-subtitle') ||
            el.classList.contains('detail-desc') ||
            el.classList.contains('summary-text')) {
            el.style.setProperty('color', '#374151', 'important');
            el.style.setProperty('opacity', '1', 'important');
        }

        // 设置普通文字颜色
        if (tagName === 'p' || tagName === 'span' || tagName === 'div') {
            if (!el.classList.contains('trait-percent') &&
                !el.classList.contains('play-bar-score') &&
                !el.classList.contains('info-number') &&
                !el.classList.contains('detail-score') &&
                !el.classList.contains('modal-score')) {

                const currentColor = computed.color;
                if (currentColor.includes('rgb')) {
                    const values = currentColor.match(/\d+/g);
                    if (values && values.length >= 3) {
                        const r = parseInt(values[0]);
                        const g = parseInt(values[1]);
                        const b = parseInt(values[2]);
                        const brightness = (r + g + b) / 3;
                        // 如果太浅就改成深色
                        if (brightness > 180) {
                            el.style.setProperty('color', '#4B5563', 'important');
                            el.style.setProperty('opacity', '1', 'important');
                        }
                    }
                }
            }
        }

        // 保持粉色的元素
        if (el.classList.contains('trait-percent') ||
            el.classList.contains('play-bar-score') ||
            el.classList.contains('detail-score') ||
            el.classList.contains('info-number')) {
            el.style.setProperty('color', '#F94C8C', 'important');
            el.style.setProperty('font-weight', '700', 'important');
            el.style.setProperty('opacity', '1', 'important');
        }

        // 背景色 - 移除所有可能的半透明背景
        if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            // 将rgba转换为rgb（移除alpha通道）
            const bgColor = computed.backgroundColor;
            if (bgColor.includes('rgba')) {
                const values = bgColor.match(/[\d.]+/g);
                if (values && values.length >= 3) {
                    const r = Math.round(parseFloat(values[0]));
                    const g = Math.round(parseFloat(values[1]));
                    const b = Math.round(parseFloat(values[2]));
                    el.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
                }
            } else {
                el.style.backgroundColor = bgColor;
            }
        }

        // 背景渐变 - 保留但确保不透明
        if (computed.backgroundImage && computed.backgroundImage !== 'none') {
            el.style.backgroundImage = computed.backgroundImage;
        }

        // 边框
        if (computed.borderColor && computed.borderColor !== 'rgba(0, 0, 0, 0)') {
            el.style.borderColor = computed.borderColor;
        }
        if (computed.borderWidth && computed.borderWidth !== '0px') {
            el.style.borderWidth = computed.borderWidth;
        }
        if (computed.borderStyle && computed.borderStyle !== 'none') {
            el.style.borderStyle = computed.borderStyle;
        }

        // 边距
        if (computed.padding) {
            el.style.padding = computed.padding;
        }
        if (computed.margin) {
            el.style.margin = computed.margin;
        }

        // 圆角
        if (computed.borderRadius && computed.borderRadius !== '0px') {
            el.style.borderRadius = computed.borderRadius;
        }

        // 字体大小
        if (computed.fontSize) {
            el.style.fontSize = computed.fontSize;
        }
    });

    exportContainer.appendChild(clonedContent);
    document.body.appendChild(exportContainer);

    // 等待一下让样式生效
    setTimeout(() => {
        // 使用 html2canvas 生成图片
        html2canvas(exportContainer, {
            backgroundColor: '#FFFFFF',
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: false,
            width: 680,
            height: exportContainer.scrollHeight
        }).then(canvas => {
            // 清理临时容器
            document.body.removeChild(exportContainer);
            // 恢复按钮显示
            actionButtons.style.display = originalDisplay;

            // 将 canvas 转换为图片并下载
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `BDSM测试结果_${new Date().getTime()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showNotification('图片已保存到本地');
            });
        }).catch(error => {
            // 清理临时容器
            if (document.body.contains(exportContainer)) {
                document.body.removeChild(exportContainer);
            }
            // 恢复按钮显示
            actionButtons.style.display = originalDisplay;
            console.error('生成图片失败:', error);
            showNotification('生成图片失败，请重试');
        });
    }, 300);
}

// 生成结果文本
function generateResultText() {
    let text = 'BDSM恋爱倾向测试结果\n';
    text += '='.repeat(40) + '\n\n';

    const sortedScores = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0);

    sortedScores.forEach(([dimension, score]) => {
        const desc = resultDescriptions[dimension];
        text += `${desc.name}: ${score.toFixed(1)}%\n`;
        text += `${desc.fullDesc}\n\n`;
    });

    text += '\n本结果仅供参考，请在安全、同意的前提下探索。\n';
    text += '测试时间：' + new Date().toLocaleString('zh-CN') + '\n';

    return text;
}

// 分享结果
function shareResult() {
    const sortedScores = Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0);

    const topThree = sortedScores.slice(0, 3);
    const shareText = `我的BDSM倾向测试结果：\n${topThree.map(([dim, score]) =>
        `${resultDescriptions[dim].name.split(' ')[0]} ${score.toFixed(1)}%`
    ).join('\n')}`;

    // 复制到剪贴板
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('结果已复制到剪贴板');
        }).catch(() => {
            fallbackCopyTextToClipboard(shareText);
        });
    } else {
        fallbackCopyTextToClipboard(shareText);
    }
}

// 备用复制方法
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showNotification('结果已复制到剪贴板');
    } catch (err) {
        showNotification('复制失败，请手动复制');
    }

    document.body.removeChild(textArea);
}

// 重新测试
function restartTest() {
    if (confirm('确定要重新开始测试吗？')) {
        startTest();
    }
}

// 显示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--gradient-pink);
        color: white;
        padding: 16px 32px;
        border-radius: 24px;
        box-shadow: var(--shadow-lg);
        font-size: 16px;
        font-weight: 600;
        z-index: 9999;
        animation: fadeIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 2000);
}

// 添加fadeOut动画
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translate(-50%, -50%);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -60%);
        }
    }
`;
document.head.appendChild(style);

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (document.getElementById('test-page').classList.contains('active')) {
        if (e.key >= '1' && e.key <= '4') {
            const optionIndex = parseInt(e.key) - 1;
            if (optionIndex < questions[currentQuestion].options.length) {
                selectOption(optionIndex);
            }
        } else if (e.key === 'ArrowLeft') {
            prevQuestion();
        } else if (e.key === 'ArrowRight' && answers[currentQuestion] !== undefined) {
            nextQuestion();
        }
    }
});
