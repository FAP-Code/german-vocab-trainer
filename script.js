// German Learning Tool - Main Application Logic

class GermanLearningApp {
    constructor() {
        this.germanWords = [];
        this.currentQuiz = {
            questions: [],
            currentIndex: 0,
            selectedAnswers: [],
            score: 0,
            levels: [],
            types: []
        };
        this.statistics = this.loadStatistics();
        this.isDarkMode = localStorage.getItem('darkMode') === 'true' || false;
        this.init();
    }

    async init() {
        await this.loadGermanWords();
        this.setupEventListeners();
        this.updateTheme();
        this.displayAllVocabulary();
        this.displayStatistics();
    }

    async loadGermanWords() {
        try {
            const response = await fetch('data/german-words.json');
            this.germanWords = await response.json();
        } catch (error) {
            console.error('Error loading German words:', error);
            this.germanWords = this.getFallbackData();
        }
    }

    getFallbackData() {
        return [
            { german: 'Hallo', english: 'Hello', type: 'Interjection', level: 'A1', gender: '', alternatives: ['Hi', 'Hi there'] },
            { german: 'Welt', english: 'World', type: 'Noun', level: 'A1', gender: 'feminine', alternatives: ['Planet', 'Globe'] },
        ];
    }

    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Quiz Controls
        document.getElementById('startBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipQuestion());
        document.getElementById('retakeBtn').addEventListener('click', () => this.resetAndRetake());
        document.getElementById('reviewBtn').addEventListener('click', () => this.showReview());
        document.getElementById('backBtn').addEventListener('click', () => this.backToSetup());
        document.getElementById('backToResultBtn').addEventListener('click', () => this.showResults());
        document.getElementById('backToSetupBtn').addEventListener('click', () => this.backToSetup());

        // Vocabulary Search and Filter
        document.getElementById('searchInput').addEventListener('input', () => this.filterVocabulary());
        document.getElementById('vocabLevelFilter').addEventListener('change', () => this.filterVocabulary());
        document.getElementById('vocabTypeFilter').addEventListener('change', () => this.filterVocabulary());

        // Statistics
        document.getElementById('resetStatsBtn').addEventListener('click', () => this.resetStatistics());
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');

        if (tabName === 'vocabulary') {
            this.displayAllVocabulary();
        } else if (tabName === 'statistics') {
            this.displayStatistics();
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', this.isDarkMode);
        this.updateTheme();
    }

    updateTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('themeToggle').textContent = '🌙';
        }
    }

    // QUIZ FUNCTIONALITY
    startQuiz() {
        const selectedLevels = this.getSelectedLevels();
        const selectedTypes = this.getSelectedTypes();
        const questionCount = parseInt(document.getElementById('questionCount').value);

        if (selectedLevels.length === 0 || selectedTypes.length === 0) {
            alert('Please select at least one level and one word type');
            return;
        }

        let filteredWords = this.germanWords.filter(word => {
            const levelMatch = selectedLevels.includes('all') || selectedLevels.includes(word.level);
            const typeMatch = selectedTypes.includes('All') || selectedTypes.includes(word.type);
            return levelMatch && typeMatch;
        });

        if (filteredWords.length === 0) {
            alert('No words found for selected criteria');
            return;
        }

        filteredWords = this.shuffleArray(filteredWords);
        const selectedWords = filteredWords.slice(0, Math.min(questionCount, filteredWords.length));

        this.currentQuiz.questions = selectedWords.map(word => {
            const wrongAnswers = this.getWrongAnswers(word.english, selectedWords, 3);
            const allAnswers = [word.english, ...wrongAnswers].sort(() => Math.random() - 0.5);
            return {
                ...word,
                options: allAnswers,
                correctIndex: allAnswers.indexOf(word.english),
                userAnswer: null
            };
        });

        this.currentQuiz.currentIndex = 0;
        this.currentQuiz.selectedAnswers = [];
        this.currentQuiz.score = 0;
        this.currentQuiz.levels = selectedLevels;
        this.currentQuiz.types = selectedTypes;

        document.getElementById('quizSetup').classList.add('hidden');
        document.getElementById('quizScreen').classList.remove('hidden');
        this.displayQuestion();
    }

    getSelectedLevels() {
        const checkboxes = document.querySelectorAll('.level-check:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    getSelectedTypes() {
        const checkboxes = document.querySelectorAll('.type-check:checked');
        return Array.from(checkboxes).map(cb => cb.value);
    }

    getWrongAnswers(correctAnswer, allWords, count) {
        const wrongAnswers = new Set();
        const availableWords = allWords.filter(w => w.english !== correctAnswer);

        while (wrongAnswers.size < count && availableWords.length > 0) {
            const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            wrongAnswers.add(randomWord.english);
        }

        if (wrongAnswers.size < count) {
            allWords.forEach(word => {
                if (wrongAnswers.size < count && word.english !== correctAnswer) {
                    if (word.alternatives && word.alternatives.length > 0) {
                        wrongAnswers.add(word.alternatives[0]);
                    }
                }
            });
        }

        return Array.from(wrongAnswers).slice(0, count);
    }

    displayQuestion() {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        const totalQuestions = this.currentQuiz.questions.length;

        document.getElementById('questionNumber').textContent = `Question ${this.currentQuiz.currentIndex + 1} of ${totalQuestions}`;
        document.getElementById('score').textContent = `Score: ${this.currentQuiz.score}/${this.currentQuiz.currentIndex}`;

        const progress = ((this.currentQuiz.currentIndex) / totalQuestions) * 100;
        document.getElementById('progressFill').style.width = progress + '%';

        document.getElementById('germanWord').textContent = question.german;
        document.getElementById('wordType').textContent = question.type;
        document.getElementById('wordLevel').textContent = question.level;

        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const btn = document.createElement('button');
            btn.className = 'btn option-btn';
            btn.textContent = option;
            btn.addEventListener('click', () => this.selectAnswer(index));
            optionsContainer.appendChild(btn);
        });
    }

    selectAnswer(index) {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        question.userAnswer = index;

        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns.forEach((btn, i) => {
            btn.disabled = true;
            if (i === question.correctIndex) {
                btn.classList.add('correct');
            }
            if (i === index && index !== question.correctIndex) {
                btn.classList.add('incorrect');
            }
        });

        if (index === question.correctIndex) {
            this.currentQuiz.score++;
        }

        this.currentQuiz.selectedAnswers.push({
            question: question.german,
            selected: question.options[index],
            correct: question.options[question.correctIndex],
            isCorrect: index === question.correctIndex
        });

        setTimeout(() => this.nextQuestion(), 1500);
    }

    skipQuestion() {
        const question = this.currentQuiz.questions[this.currentQuiz.currentIndex];
        this.currentQuiz.selectedAnswers.push({
            question: question.german,
            selected: 'Skipped',
            correct: question.options[question.correctIndex],
            isCorrect: false
        });
        this.nextQuestion();
    }

    nextQuestion() {
        this.currentQuiz.currentIndex++;
        if (this.currentQuiz.currentIndex < this.currentQuiz.questions.length) {
            this.displayQuestion();
        } else {
            this.endQuiz();
        }
    }

    endQuiz() {
        this.updateStatistics();
        this.saveStatistics();
        this.showResults();
    }

    showResults() {
        document.getElementById('quizScreen').classList.add('hidden');
        document.getElementById('reviewScreen').classList.add('hidden');
        document.getElementById('quizResult').classList.remove('hidden');

        const totalQuestions = this.currentQuiz.questions.length;
        const score = this.currentQuiz.score;
        const percentage = Math.round((score / totalQuestions) * 100);

        document.getElementById('finalScore').textContent = score;
        document.getElementById('totalQuestions').textContent = totalQuestions;
        document.getElementById('resultPercentage').textContent = `${percentage}% Correct`;

        let feedback = 'Great effort!';
        if (percentage >= 90) {
            feedback = '🎉 Excellent! You\'re a German master!';
        } else if (percentage >= 80) {
            feedback = '⭐ Very Good! Keep it up!';
        } else if (percentage >= 70) {
            feedback = '👍 Good job! Keep practicing!';
        } else if (percentage >= 60) {
            feedback = '📚 Not bad! Review the material and try again.';
        } else {
            feedback = '💪 Keep learning! Practice makes perfect.';
        }

        document.getElementById('resultFeedback').textContent = feedback;
    }

    showReview() {
        document.getElementById('quizResult').classList.add('hidden');
        document.getElementById('reviewScreen').classList.remove('hidden');

        const reviewContainer = document.getElementById('reviewContainer');
        reviewContainer.innerHTML = '';

        this.currentQuiz.selectedAnswers.forEach((answer, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = `review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;

            reviewItem.innerHTML = `
                <div class="review-item-header">
                    <span class="review-item-question">${index + 1}. ${answer.question}</span>
                    <span class="review-item-status">${answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}</span>
                </div>
                <div class="review-item-content">
                    <p><strong>Your answer:</strong> ${answer.selected}</p>
                    <p><strong>Correct answer:</strong> ${answer.correct}</p>
                </div>
            `;

            reviewContainer.appendChild(reviewItem);
        });
    }

    resetAndRetake() {
        document.getElementById('quizResult').classList.add('hidden');
        document.getElementById('quizSetup').classList.remove('hidden');
    }

    backToSetup() {
        document.getElementById('quizScreen').classList.add('hidden');
        document.getElementById('quizResult').classList.add('hidden');
        document.getElementById('reviewScreen').classList.add('hidden');
        document.getElementById('quizSetup').classList.remove('hidden');
    }

    // VOCABULARY FUNCTIONALITY
    displayAllVocabulary() {
        this.filterVocabulary();
    }

    filterVocabulary() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const levelFilter = document.getElementById('vocabLevelFilter').value;
        const typeFilter = document.getElementById('vocabTypeFilter').value;

        let filtered = this.germanWords.filter(word => {
            const matchSearch = !searchTerm || word.german.toLowerCase().includes(searchTerm) || word.english.toLowerCase().includes(searchTerm);
            const matchLevel = !levelFilter || word.level === levelFilter;
            const matchType = !typeFilter || word.type === typeFilter;
            return matchSearch && matchLevel && matchType;
        });

        this.displayVocabularyList(filtered);
    }

    displayVocabularyList(words) {
        const vocabList = document.getElementById('vocabularyList');
        vocabList.innerHTML = '';

        if (words.length === 0) {
            vocabList.innerHTML = '<p style="text-align: center; padding: 2rem; color: var(--text-light);">No words found.</p>';
            return;
        }

        words.forEach(word => {
            const vocabItem = document.createElement('div');
            vocabItem.className = 'vocab-item';

            let genderInfo = '';
            if (word.gender) {
                genderInfo = `<span style="color: var(--text-light); margin-left: 0.5rem;;">(${word.gender})</span>`;
            }

            vocabItem.innerHTML = `
                <div class="vocab-item-header">
                    <div>
                        <span class="vocab-german">${word.german}</span>${genderInfo}
                        <span class="vocab-type">${word.type}</span>
                    </div>
                </div>
                <div class="vocab-english">${word.english}</div>
                <div class="vocab-meta">
                    <span class="vocab-level">${word.level}</span>
                </div>
            `;

            vocabList.appendChild(vocabItem);
        });
    }

    // STATISTICS FUNCTIONALITY
    loadStatistics() {
        const stats = localStorage.getItem('germanLearningStats');
        return stats ? JSON.parse(stats) : {
            totalQuizzes: 0,
            totalCorrect: 0,
            totalAnswered: 0,
            byLevel: {
                A1: { correct: 0, total: 0 },
                A2: { correct: 0, total: 0 },
                B1: { correct: 0, total: 0 },
                B2: { correct: 0, total: 0 }
            },
            byType: {
                'Noun': { correct: 0, total: 0 },
                'Verb': { correct: 0, total: 0 },
                'Adjective': { correct: 0, total: 0 },
                'Preposition': { correct: 0, total: 0 },
                'Adverb': { correct: 0, total: 0 },
                'Pronoun': { correct: 0, total: 0 },
                'Conjunction': { correct: 0, total: 0 },
                'Article': { correct: 0, total: 0 },
                'Interjection': { correct: 0, total: 0 }
            }
        };
    }

    updateStatistics() {
        this.statistics.totalQuizzes++;
        this.statistics.totalCorrect += this.currentQuiz.score;
        this.statistics.totalAnswered += this.currentQuiz.questions.length;

        this.currentQuiz.questions.forEach((question, index) => {
            const isCorrect = this.currentQuiz.selectedAnswers[index]?.isCorrect;
            const level = question.level;
            const type = question.type;

            if (!this.statistics.byLevel[level]) {
                this.statistics.byLevel[level] = { correct: 0, total: 0 };
            }
            this.statistics.byLevel[level].total++;
            if (isCorrect) {
                this.statistics.byLevel[level].correct++;
            }

            if (!this.statistics.byType[type]) {
                this.statistics.byType[type] = { correct: 0, total: 0 };
            }
            this.statistics.byType[type].total++;
            if (isCorrect) {
                this.statistics.byType[type].correct++;
            }
        });
    }

    displayStatistics() {
        const stats = this.statistics;
        const accuracy = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0;

        document.getElementById('totalQuizzes').textContent = stats.totalQuizzes;
        document.getElementById('overallAccuracy').textContent = accuracy + '%';
        document.getElementById('totalAnswered').textContent = stats.totalAnswered;
        document.getElementById('totalCorrect').textContent = stats.totalCorrect;

        const levelStatsHTML = Object.entries(stats.byLevel).map(([level, data]) => {
            const levelAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
            const barWidth = data.total > 0 ? levelAccuracy : 0;
            return `
                <div class="stat-row">
                    <span class="stat-row-label">Level ${level}</span>
                    <div class="stat-row-value">
                        <div class="progress-mini">
                            <div class="progress-mini-fill" style="width: ${barWidth}%"></div>
                        </div>
                        <span>${data.correct}/${data.total} (${levelAccuracy}%)</span>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('levelStats').innerHTML = levelStatsHTML || '<p style="color: var(--text-light);">No data yet</p>';

        const typeStatsHTML = Object.entries(stats.byType)
            .filter(([_, data]) => data.total > 0)
            .map(([type, data]) => {
                const typeAccuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                const barWidth = data.total > 0 ? typeAccuracy : 0;
                return `
                    <div class="stat-row">
                        <span class="stat-row-label">${type}</span>
                        <div class="stat-row-value">
                            <div class="progress-mini">
                                <div class="progress-mini-fill" style="width: ${barWidth}%"></div>
                            </div>
                            <span>${data.correct}/${data.total} (${typeAccuracy}%)</span>
                        </div>
                    </div>
                `;
            }).join('');

        document.getElementById('typeStats').innerHTML = typeStatsHTML || '<p style="color: var(--text-light);">No data yet</p>';
    }

    saveStatistics() {
        localStorage.setItem('germanLearningStats', JSON.stringify(this.statistics));
    }

    resetStatistics() {
        if (confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
            this.statistics = this.loadStatistics();
            localStorage.removeItem('germanLearningStats');
            this.statistics = this.loadStatistics();
            this.displayStatistics();
            alert('Statistics have been reset.');
        }
    }

    // UTILITY FUNCTIONS
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GermanLearningApp();
});