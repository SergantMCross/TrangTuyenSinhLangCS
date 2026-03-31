// ─── AdmissionsEngine ───
class AdmissionsEngine {
  constructor() {
    this.regionScores = { "1": 0.75, "2NT": 0.5, "2": 0.25, "3": 0 };
    this.targetScores = { "01": 2.0, "06": 1.0, "none": 0 };
    this.BLOCKS = {
      "A00": ["TOAN", "LY", "HOA"],
      "A01": ["TOAN", "LY", "ANH"],
      "B00": ["TOAN", "HOA", "SINH"],
      "C00": ["VAN", "SU", "DIA"],
      "D01": ["TOAN", "VAN", "ANH"],
      "D07": ["TOAN", "HOA", "ANH"],
      "D08": ["TOAN", "SINH", "ANH"]
    };
    this.METHODS = {
      1: ["10_S1", "10_S2", "11_S1", "11_S2", "12_S1"],
      2: ["11_S1", "11_S2", "12_S1"],
      3: ["12_CN"],
      4: ["10_S1", "10_S2", "11_S1", "11_S2", "12_S1", "12_S2"],
      5: ["10_CN", "11_CN", "12_CN"],
      6: ["10_S1", "10_S2", "11_S1", "11_S2", "12_S1"]
    };
  }

  normalize(val) {
    let n = parseFloat(val);
    if (isNaN(n) || n < 0) return null;
    if (n > 100) n /= 100;
    else if (n > 10) n /= 10;
    return Math.min(Math.round(n * 100) / 100, 10);
  }

  average(grades) {
    const valid = grades
      .map(g => this.normalize(g))
      .filter(g => g !== null);
    if (!valid.length) return 0;
    return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
  }

  getPriority(raw, regionId, targetId) {
    const base = (this.regionScores[regionId] || 0) + (this.targetScores[targetId] || 0);
    if (raw < 22.5) return base;
    const factor = (30 - raw) / 7.5;
    return Math.max(0, Math.round(base * factor * 100) / 100);
  }

  getGradesByMethod(subjectData, methodId) {
    const required = this.METHODS[methodId] || [];
    return required.map(k => subjectData[k]).filter(v => v !== undefined);
  }

  calculateBlock({ transcript, block, methodId, x2Key, regionId, targetId }) {
    const subjects = this.BLOCKS[block];
    if (!subjects) return null;

    const averages = {};
    let missing = false;

    subjects.forEach(sub => {
      const grades = this.getGradesByMethod(transcript[sub] || {}, methodId);
      const avg = this.average(grades);
      if (!avg) missing = true;
      averages[sub] = avg;
    });

    if (missing) return null;

    let raw = 0;
    if (x2Key && subjects.includes(x2Key)) {
      const sum = subjects.reduce((a, s) => a + averages[s], 0) + averages[x2Key];
      raw = (sum / 4) * 3;
    } else {
      raw = subjects.reduce((a, s) => a + averages[s], 0);
    }

    raw = Math.round(raw * 100) / 100;
    const priority = this.getPriority(raw, regionId, targetId);
    const total = Math.round((raw + priority) * 100) / 100;

    return { block, subjects, averages, raw, priority, total };
  }

  calculateAll(input) {
    const results = [];
    Object.keys(this.BLOCKS).forEach(block => {
      const res = this.calculateBlock({ ...input, block });
      if (res) results.push(res);
    });
    results.sort((a, b) => b.total - a.total);
    return { best: results.slice(0, 3), all: results };
  }
}

const admissionsEngine = new AdmissionsEngine();

// ─── Subject mapping for exam combos ───
const comboSubjects = {
  'A00': ['Toán', 'Lý', 'Hóa'],
  'A01': ['Toán', 'Lý', 'Anh'],
  'B00': ['Toán', 'Hóa', 'Sinh'],
  'C00': ['Văn', 'Sử', 'Địa'],
  'D01': ['Toán', 'Văn', 'Anh']
};

document.getElementById('exam-combo').addEventListener('change', function() {
  const subjects = comboSubjects[this.value];
  document.getElementById('exam-label-1').textContent = subjects[0];
  document.getElementById('exam-label-2').textContent = subjects[1];
  document.getElementById('exam-label-3').textContent = subjects[2];
});
document.getElementById('exam-combo').dispatchEvent(new Event('change'));

// ─── Exam Calculator ───
function calculateExam() {
  const s1 = parseFloat(document.getElementById('exam-s1').value) || 0;
  const s2 = parseFloat(document.getElementById('exam-s2').value) || 0;
  const s3 = parseFloat(document.getElementById('exam-s3').value) || 0;
  const priority = parseFloat(document.getElementById('exam-priority').value) || 0;
  const region = parseFloat(document.getElementById('exam-region').value) || 0;

  const total = Math.min(s1 + s2 + s3 + priority + region, 30);
  const resultEl = document.getElementById('exam-result');
  resultEl.classList.remove('hidden');

  document.getElementById('exam-total').textContent = total.toFixed(2);
  document.getElementById('exam-bar').style.width = (total / 30 * 100) + '%';

  let assessment = '';
  if (total >= 27) assessment = '🎯 Rất cao — Cơ hội trúng tuyển các ngành top đầu';
  else if (total >= 24) assessment = '✅ Khá tốt — Đủ điều kiện nhiều ngành cạnh tranh';
  else if (total >= 20) assessment = '📊 Trung bình — Phù hợp nhiều ngành đại học';
  else assessment = '📚 Cần cố gắng thêm — Nên cân nhắc kỹ ngành đăng ký';
  document.getElementById('exam-assessment').textContent = assessment;
}

// ─── Transcript Calculator ───
function calculateTranscript() {
  const method = document.getElementById('transcript-method').value;
  const subjects = ['toan', 'van', 'su', 'dia', 'ly', 'hoa', 'sinh', 'tin', 'cong-nghe', 'gdktpl'];
  const subjectLabels = ['Toán', 'Văn', 'Sử', 'Địa', 'Lý', 'Hóa', 'Sinh', 'Tin học', 'Công nghệ', 'GDKTPL'];
  let subjectAverages = [];

  subjects.forEach((sub, idx) => {
    const inputs = Array.from(document.querySelectorAll(`[data-subject="${sub}"]`));
    const values = inputs.map(inp => parseFloat(inp.value) || 0);

    let avg = 0;
    if (method === 'avg3') {
      avg = values.reduce((a, b) => a + b, 0) / 6;
    } else if (method === 'avg1112') {
      avg = (values[2] + values[3] + values[4] + values[5]) / 4;
    } else {
      avg = (values[4] + values[5]) / 2;
    }

    subjectAverages.push(avg);
  });

  const gpa = subjectAverages.reduce((a, b) => a + b, 0) / subjects.length;
  const total = Math.min(gpa * 3, 30);

  // Update results cards
  document.getElementById('results-total-score').textContent = total.toFixed(2);
  document.getElementById('results-progress').style.width = (total / 30 * 100) + '%';

  let assessment = '';
  if (total >= 27) assessment = '🎯 Xuất sắc — Đạt yêu cầu hầu hết các ngành';
  else if (total >= 24) assessment = '✅ Tốt — Nhiều cơ hội trúng tuyển';
  else if (total >= 20) assessment = '📊 Khá — Phù hợp một số ngành';
  else assessment = '📚 Cần nâng cao điểm số';
  document.getElementById('results-assessment').textContent = assessment;

  // Update subject list
  const subjectList = document.getElementById('subject-list');
  subjectList.innerHTML = '';
  subjectAverages.forEach((avg, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 rounded-lg';
    row.style.background = '#F9FAFB';
    row.innerHTML = `<span class="text-sm font-medium" style="color:#666;">${subjectLabels[idx]}</span><span class="text-sm font-semibold" style="color:#A51C30;">${avg.toFixed(2)}</span>`;
    subjectList.appendChild(row);
  });

  // Update suggested majors
  const majorsList = document.getElementById('suggested-majors');
  majorsList.innerHTML = '';
  const majors = [
    { name: 'Công nghệ TT', combo: 'A00, A01, D01', score: 27.5, icon: 'code' },
    { name: 'Y Đa khoa', combo: 'B00', score: 28.0, icon: 'heart-pulse' },
    { name: 'Quản trị KD', combo: 'A00, D01', score: 26.75, icon: 'briefcase' }
  ];
  majors.forEach(major => {
    if (total >= major.score - 1) {
      const item = document.createElement('div');
      item.className = 'flex items-center gap-3 p-3 rounded-lg';
      item.style.background = '#F9FAFB';
      item.innerHTML = `<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:rgba(165,28,48,0.1);"><i data-lucide="${major.icon}" class="w-4 h-4" style="color:#A51C30;"></i></div><div class="flex-1 min-w-0"><p class="text-sm font-medium truncate" style="color:#1a1a1a;">${major.name}</p><p class="text-xs" style="color:#888;">Điểm chuẩn: ${major.score}</p></div>`;
      majorsList.appendChild(item);
    }
  });
  if (majorsList.children.length === 0) {
    majorsList.innerHTML = '<p class="text-xs" style="color:#999;">Cập nhật danh sách dựa trên điểm của bạn</p>';
  }
  lucide.createIcons();

  const resultEl = document.getElementById('transcript-result');
  resultEl.classList.remove('hidden');
  document.getElementById('transcript-total').textContent = total.toFixed(2);
  document.getElementById('transcript-bar').style.width = (total / 30 * 100) + '%';
  document.getElementById('transcript-assessment').textContent = assessment;
}

// ─── Mobile Menu ───
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;
  const isOpen = menu.classList.toggle('open');
  // Prevent background scroll when the drawer is open (mobile-friendly)
  document.body.style.overflow = isOpen ? 'hidden' : '';
}

// Close mobile menu with ESC (and restore scroll)
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const menu = document.getElementById('mobile-menu');
  if (menu && menu.classList.contains('open')) {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// If user resizes to desktop while menu is open, restore scroll
window.addEventListener('resize', () => {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;
  if (window.matchMedia('(min-width: 768px)').matches && menu.classList.contains('open')) {
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// ─── Navbar scroll effect ───
const appRoot = document.getElementById('app-root');
appRoot.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  if (appRoot.scrollTop > 20) nav.classList.add('nav-scrolled');
  else nav.classList.remove('nav-scrolled');
});

// ─── Download brochure (toast) ───
function downloadBrochure() {
  const toast = document.getElementById('toast');
  toast.classList.remove('opacity-0', 'translate-y-4', 'pointer-events-none');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-4', 'pointer-events-none');
    toast.classList.remove('opacity-100', 'translate-y-0');
  }, 4000);
}

// ─── Smooth scroll for hash links ───
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ─── University Database ───
const universitiesData = [
  {"stt": 1, "code": "KHA", "name": "Đại Học Kinh Tế Quốc Dân", "region": "Miền Bắc", "type": "Kinh tế", "website": "neu.edu.vn"},
  {"stt": 2, "code": "BKA", "name": "Đại Học Bách Khoa Hà Nội", "region": "Miền Bắc", "type": "Kỹ thuật", "website": "hust.edu.vn"},
  {"stt": 3, "code": "HTC", "name": "Học Viện Tài chính", "region": "Miền Bắc", "type": "Tài chính", "website": "hvtc.edu.vn"},
  {"stt": 4, "code": "NHH", "name": "Học Viện Ngân Hàng", "region": "Miền Bắc", "type": "Tài chính", "website": "hvnh.edu.vn"},
  {"stt": 5, "code": "NTH", "name": "Trường Đại học Ngoại thương", "region": "Miền Bắc", "type": "Kinh tế", "website": "ftu.edu.vn"},
  {"stt": 6, "code": "YHB", "name": "Trường Đại Học Y Hà Nội", "region": "Miền Bắc", "type": "Y dược", "website": "hmu.edu.vn"},
  {"stt": 7, "code": "BVH", "name": "Học Viện Công Nghệ Bưu Chính Viễn Thông", "region": "Miền Bắc", "type": "CNTT", "website": "ptit.edu.vn"},
  {"stt": 8, "code": "SPH", "name": "Trường Đại Học Sư Phạm Hà Nội", "region": "Miền Bắc", "type": "Sư phạm", "website": "hnue.edu.vn"},
  {"stt": 9, "code": "TMU", "name": "Trường Đại Học Thương Mại", "region": "Miền Bắc", "type": "Kinh tế", "website": "vcu.edu.vn"},
  {"stt": 10, "code": "SPS", "name": "Trường Đại Học Sư Phạm TPHCM", "region": "Miền Nam", "type": "Sư phạm", "website": "hcmup.edu.vn"},
  {"stt": 11, "code": "QHI", "name": "Trường Đại Học Công Nghệ – Đại Học Quốc Gia Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 12, "code": "HNM", "name": "Trường Đại học Thủ Đô Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 13, "code": "GHA", "name": "Trường Đại Học Giao Thông Vận Tải", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 14, "code": "DCN", "name": "Đại Học Công Nghiệp Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 15, "code": "IUH", "name": "Trường Đại Học Công Nghiệp TPHCM", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 16, "code": "HPN", "name": "Học Viện Phụ Nữ Việt Nam", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 17, "code": "ANH", "name": "Học Viện An Ninh Nhân Dân", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 18, "code": "CSH", "name": "Học Viện Cảnh Sát Nhân Dân", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 19, "code": "DKK", "name": "Trường Đại Học Kinh Tế Kỹ Thuật Công Nghiệp", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 20, "code": "DCT", "name": "Trường Đại Học Công Thương TPHCM", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 21, "code": "HHK", "name": "Học Viện Hàng không Việt Nam", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 22, "code": "PKA", "name": "Đại Học Phenikaa", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 23, "code": "CSS", "name": "Trường Đại Học Cảnh Sát Nhân Dân", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 24, "code": "NHF", "name": "Trường Đại Học Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 25, "code": "YTC", "name": "Trường Đại Học Y Tế Công Cộng", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 26, "code": "HQT", "name": "Học Viện Ngoại Giao", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 27, "code": "ANS", "name": "Trường Đại Học An Ninh Nhân Dân", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 28, "code": "TDM", "name": "Trường Đại học Thủ Dầu Một", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 29, "code": "DTL", "name": "Trường Đại Học Thăng Long", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 30, "code": "TLA", "name": "Trường Đại Học Thủy Lợi", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 31, "code": "QST", "name": "Trường Đại Học Khoa Học Tự Nhiên TPHCM", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 32, "code": "VHH", "name": "Trường Đại Học Văn Hóa Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 33, "code": "DTT", "name": "Trường Đại Học Tôn Đức Thắng", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 34, "code": "HVN", "name": "Học Viện Nông Nghiệp Việt Nam", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 35, "code": "QHX", "name": "Trường Đại Học Khoa Học Xã Hội và Nhân Văn Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 36, "code": "LPH", "name": "Trường Đại Học Luật Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 37, "code": "QHF", "name": "Trường Đại Học Ngoại Ngữ - ĐH Quốc Gia Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 38, "code": "HBT", "name": "Học viện Báo chí và Tuyên truyền", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 39, "code": "QHT", "name": "Trường Đại Học Khoa Học Tự Nhiên Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 40, "code": "QHE", "name": "Trường Đại Học Kinh Tế - ĐHQG Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 41, "code": "DTS", "name": "Đại Học Sư Phạm Thái Nguyên", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 42, "code": "LCH", "name": "Trường Sĩ Quan Chính Trị - Đại Học Chính Trị", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 43, "code": "TCT", "name": "Đại Học Cần Thơ", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 44, "code": "DKS", "name": "Trường Đại học Kiểm Sát", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 45, "code": "BPH", "name": "Học Viện Biên Phòng", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 46, "code": "QHL", "name": "Trường Đại học Luật – ĐHQG Hà Nội", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 47, "code": "DHS", "name": "Đại Học Sư Phạm Huế", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 48, "code": "SGD", "name": "Đại Học Sài Gòn", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 49, "code": "NQH", "name": "Học Viện Khoa Học Quân Sự - Hệ Quân sự", "region": "Chưa phân loại", "type": "Chưa phân loại"},
  {"stt": 50, "code": "FTU2", "name": "Trường Đại học Ngoại thương (Cơ sở II)", "region": "Miền Nam", "type": "Kinh tế", "website": "cs2.ftu.edu.vn"},
  {"stt": 51, "code": "PTIT", "name": "HV Công nghệ Bưu chính Viễn thông", "region": "Miền Bắc", "type": "CNTT", "website": "ptit.edu.vn"},
  {"stt": 52, "code": "UET", "name": "ĐH Công nghệ - ĐHQGHN", "region": "Miền Bắc", "type": "CNTT", "website": "uet.vnu.edu.vn"},
  {"stt": 53, "code": "HVCS", "name": "Học viện Cảnh sát", "region": "Miền Bắc", "type": "Công an", "website": "csnd.edu.vn"},
  {"stt": 54, "code": "HVHC", "name": "Học viện Hành chính Quốc gia", "region": "Miền Bắc", "type": "Hành chính", "website": "napa.vn"},
  {"stt": 55, "code": "VNU-HN", "name": "ĐH Quốc gia Hà Nội", "region": "Miền Bắc", "type": "Hệ thống", "website": "vnu.edu.vn"},
  {"stt": 6, "code": "TNU", "name": "ĐH Thái Nguyên", "region": "Miền Bắc", "type": "Hệ thống"},
  {"stt": 7, "code": "HUBT", "name": "ĐH Kinh doanh & Công nghệ HN", "region": "Miền Bắc", "type": "Kinh tế"},
  {"stt": 8, "code": "DHKD", "name": "ĐH Kinh doanh Công nghệ", "region": "Miền Bắc", "type": "Kinh tế"},
  {"stt": 9, "code": "NEU", "name": "ĐH Kinh tế Quốc dân", "region": "Miền Bắc", "type": "Kinh tế"},
  {"stt": 10, "code": "FTU", "name": "ĐH Ngoại thương", "region": "Miền Bắc", "type": "Kinh tế"},
  {"stt": 11, "code": "TMU", "name": "ĐH Thương mại", "region": "Miền Bắc", "type": "Kinh tế"},
  {"stt": 12, "code": "HUST", "name": "ĐH Bách khoa Hà Nội", "region": "Miền Bắc", "type": "Kỹ thuật"},
  {"stt": 13, "code": "HIT", "name": "ĐH Công nghiệp Hà Nội", "region": "Miền Bắc", "type": "Kỹ thuật"},
  {"stt": 14, "code": "TLU", "name": "ĐH Thủy lợi", "region": "Miền Bắc", "type": "Kỹ thuật"},
  {"stt": 15, "code": "XDHN", "name": "ĐH Xây dựng Hà Nội", "region": "Miền Bắc", "type": "Kỹ thuật"},
  {"stt": 16, "code": "HLU", "name": "ĐH Luật Hà Nội", "region": "Miền Bắc", "type": "Luật"},
  {"stt": 17, "code": "HANU", "name": "ĐH Hà Nội", "region": "Miền Bắc", "type": "Ngôn ngữ"},
  {"stt": 18, "code": "DHHN", "name": "ĐH Hà Nội", "region": "Miền Bắc", "type": "Ngôn ngữ"},
  {"stt": 19, "code": "ULIS", "name": "ĐH Ngoại ngữ - ĐHQGHN", "region": "Miền Bắc", "type": "Ngôn ngữ"},
  {"stt": 20, "code": "HUA", "name": "HV Nông nghiệp Việt Nam", "region": "Miền Bắc", "type": "Nông nghiệp"},
  {"stt": 21, "code": "VNUA", "name": "HV Nông nghiệp Việt Nam", "region": "Miền Bắc", "type": "Nông nghiệp"},
  {"stt": 22, "code": "LHU", "name": "ĐH Lâm nghiệp", "region": "Miền Bắc", "type": "Nông nghiệp"},
  {"stt": 23, "code": "VNUF", "name": "ĐH Lâm nghiệp", "region": "Miền Bắc", "type": "Nông nghiệp"},
  {"stt": 24, "code": "MTA", "name": "Học viện Kỹ thuật Quân sự", "region": "Miền Bắc", "type": "Quân sự"},
  {"stt": 25, "code": "PKA", "name": "Học viện Phòng không - Không quân", "region": "Miền Bắc", "type": "Quân sự"},
  {"stt": 26, "code": "DAV", "name": "Học viện Ngoại giao", "region": "Miền Bắc", "type": "Quốc tế"},
  {"stt": 27, "code": "HVNG", "name": "Học viện Ngoại giao", "region": "Miền Bắc", "type": "Quốc tế"},
  {"stt": 28, "code": "VGU-HN", "name": "ĐH Việt Đức (HN)", "region": "Miền Bắc", "type": "Quốc tế"},
  {"stt": 29, "code": "SPHN", "name": "ĐH Sư phạm Hà Nội", "region": "Miền Bắc", "type": "Sư phạm"},
  {"stt": 30, "code": "SPHN2", "name": "ĐH Sư phạm Hà Nội 2", "region": "Miền Bắc", "type": "Sư phạm"},
  {"stt": 31, "code": "BA", "name": "Học viện Ngân hàng", "region": "Miền Bắc", "type": "Tài chính"},
  {"stt": 32, "code": "HVNH", "name": "Học viện Ngân hàng", "region": "Miền Bắc", "type": "Tài chính"},
  {"stt": 33, "code": "AOF", "name": "Học viện Tài chính", "region": "Miền Bắc", "type": "Tài chính"},
  {"stt": 34, "code": "HVTC", "name": "Học viện Tài chính", "region": "Miền Bắc", "type": "Tài chính"},
  {"stt": 35, "code": "AJC", "name": "HV Báo chí Tuyên truyền", "region": "Miền Bắc", "type": "Xã hội"},
  {"stt": 36, "code": "HVBC", "name": "HV Báo chí Tuyên truyền", "region": "Miền Bắc", "type": "Xã hội"},
  {"stt": 37, "code": "USSH-HN", "name": "ĐH KHXH&NV Hà Nội", "region": "Miền Bắc", "type": "Xã hội"},
  {"stt": 38, "code": "HUP", "name": "ĐH Dược Hà Nội", "region": "Miền Bắc", "type": "Y dược"},
  {"stt": 39, "code": "YDHP", "name": "ĐH Y Dược Hải Phòng", "region": "Miền Bắc", "type": "Y dược"},
  {"stt": 40, "code": "HMU", "name": "ĐH Y Hà Nội", "region": "Miền Bắc", "type": "Y dược"},
  {"stt": 41, "code": "YHN", "name": "ĐH Y Hà Nội", "region": "Miền Bắc", "type": "Y dược"},
  {"stt": 42, "code": "YTB", "name": "ĐH Y Thái Bình", "region": "Miền Bắc", "type": "Y dược"},
  {"stt": 43, "code": "DHBG", "name": "ĐH Bắc Giang", "region": "Miền Bắc", "type": "Đa ngành"},
  {"stt": 44, "code": "DHHP", "name": "ĐH Hải Phòng", "region": "Miền Bắc", "type": "Đa ngành"},
  {"stt": 45, "code": "DHLA", "name": "ĐH Lào Cai", "region": "Miền Bắc", "type": "Đa ngành"},
  {"stt": 46, "code": "DHQN", "name": "ĐH Quảng Ninh", "region": "Miền Bắc", "type": "Đa ngành"},
  {"stt": 47, "code": "VKU", "name": "ĐH CNTT & TT Việt Hàn", "region": "Miền Trung", "type": "CNTT"},
  {"stt": 48, "code": "HUE", "name": "ĐH Huế", "region": "Miền Trung", "type": "Hệ thống"},
  {"stt": 49, "code": "UDN", "name": "ĐH Đà Nẵng", "region": "Miền Trung", "type": "Hệ thống"},
  {"stt": 50, "code": "DHKH-HUE", "name": "ĐH Khoa học Huế", "region": "Miền Trung", "type": "Khoa học"},
  {"stt": 51, "code": "DUE", "name": "ĐH Kinh tế Đà Nẵng", "region": "Miền Trung", "type": "Kinh tế"},
  {"stt": 52, "code": "DUT", "name": "ĐH Bách khoa Đà Nẵng", "region": "Miền Trung", "type": "Kỹ thuật"},
  {"stt": 53, "code": "HUFLIT", "name": "ĐH Ngoại ngữ Huế", "region": "Miền Trung", "type": "Ngôn ngữ"},
  {"stt": 54, "code": "UFLS", "name": "ĐH Ngoại ngữ Đà Nẵng", "region": "Miền Trung", "type": "Ngôn ngữ"},
  {"stt": 55, "code": "DHNL-HUE", "name": "ĐH Nông lâm Huế", "region": "Miền Trung", "type": "Nông nghiệp"},
  {"stt": 56, "code": "DHSP-HUE", "name": "ĐH Sư phạm Huế", "region": "Miền Trung", "type": "Sư phạm"},
  {"stt": 57, "code": "NTU", "name": "ĐH Nha Trang", "region": "Miền Trung", "type": "Thủy sản"},
  {"stt": 58, "code": "DHKY", "name": "ĐH Kỹ thuật Y dược Đà Nẵng", "region": "Miền Trung", "type": "Y dược"},
  {"stt": 59, "code": "YDN", "name": "ĐH Y Dược Đà Nẵng", "region": "Miền Trung", "type": "Y dược"},
  {"stt": 60, "code": "YTH", "name": "ĐH Y Thanh Hóa", "region": "Miền Trung", "type": "Y dược"},
  {"stt": 61, "code": "DTU", "name": "ĐH Duy Tân", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 62, "code": "DHA", "name": "ĐH Hà Tĩnh", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 63, "code": "DNI", "name": "ĐH Nha Trang", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 64, "code": "QUI", "name": "ĐH Quy Nhơn", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 65, "code": "QNU", "name": "ĐH Quy Nhơn", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 66, "code": "DHQB", "name": "ĐH Quảng Bình", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 67, "code": "DQN2", "name": "ĐH Quảng Nam", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 68, "code": "DHTN", "name": "ĐH Tây Nguyên", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 69, "code": "DLU", "name": "ĐH Đà Lạt", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 70, "code": "DHDL", "name": "ĐH Đông Á", "region": "Miền Trung", "type": "Đa ngành"},
  {"stt": 71, "code": "BVS", "name": "HV Công nghệ Bưu chính Viễn thông (phía Nam)", "region": "Miền Nam", "type": "CNTT"},
  {"stt": 72, "code": "KMA.HCM", "name": "HV Kỹ thuật Mật mã (phía Nam)", "region": "Miền Nam", "type": "CNTT"},
  {"stt": 73, "code": "QSC", "name": "ĐH CNTT - ĐHQG HCM", "region": "Miền Nam", "type": "CNTT"},
  {"stt": 74, "code": "FPT.HCM", "name": "ĐH FPT TP.HCM", "region": "Miền Nam", "type": "CNTT"},
  {"stt": 75, "code": "DNT", "name": "ĐH Ngoại ngữ - Tin học TP.HCM", "region": "Miền Nam", "type": "CNTT"},
  {"stt": 76, "code": "ANS", "name": "ĐH An ninh Nhân dân", "region": "Miền Nam", "type": "Công an"},
  {"stt": 77, "code": "ANND", "name": "ĐH An ninh Nhân dân", "region": "Miền Nam", "type": "Công an"},
  {"stt": 78, "code": "CSS", "name": "ĐH Cảnh sát Nhân dân", "region": "Miền Nam", "type": "Công an"},
  {"stt": 79, "code": "CSND", "name": "ĐH Cảnh sát Nhân dân", "region": "Miền Nam", "type": "Công an"},
  {"stt": 80, "code": "HHK", "name": "HV Hàng không Việt Nam", "region": "Miền Nam", "type": "Hàng không"},
  {"stt": 81, "code": "HVC", "name": "Học viện Cán bộ TP.HCM", "region": "Miền Nam", "type": "Hành chính"},
  {"stt": 82, "code": "QST", "name": "ĐH KHTN - ĐHQG HCM", "region": "Miền Nam", "type": "Khoa học"},
  {"stt": 83, "code": "UEL2", "name": "ĐH Kinh tế - Luật (CS2)", "region": "Miền Nam", "type": "Kinh tế"},
  {"stt": 84, "code": "UEF", "name": "ĐH Kinh tế - Tài chính TP.HCM", "region": "Miền Nam", "type": "Kinh tế"},
  {"stt": 85, "code": "DLA", "name": "ĐH Kinh tế Công nghiệp Long An", "region": "Miền Nam", "type": "Kinh tế"},
  {"stt": 86, "code": "UEH", "name": "ĐH Kinh tế TP.HCM", "region": "Miền Nam", "type": "Kinh tế"},
  {"stt": 87, "code": "DMS", "name": "ĐH Tài chính Marketing", "region": "Miền Nam", "type": "Kinh tế"},
  {"stt": 88, "code": "DKB", "name": "ĐH Kinh tế Kỹ thuật Bình Dương", "region": "Miền Nam", "type": "Kinh tế/Kỹ thuật"},
  {"stt": 89, "code": "QSK", "name": "ĐH Kinh tế - Luật", "region": "Miền Nam", "type": "Kinh tế/Luật"},
  {"stt": 90, "code": "KTS", "name": "ĐH Kiến trúc TP.HCM", "region": "Miền Nam", "type": "Kiến trúc"},
  {"stt": 91, "code": "QSB.HCM", "name": "ĐH Bách khoa - ĐHQG HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 92, "code": "DCT", "name": "ĐH Công Thương TP.HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 93, "code": "IUH", "name": "ĐH Công nghiệp TP.HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 94, "code": "STU", "name": "ĐH Công nghệ Sài Gòn", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 95, "code": "HUTECH", "name": "ĐH Công nghệ TP.HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 96, "code": "DCD", "name": "ĐH Công nghệ Đồng Nai", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 97, "code": "PVU", "name": "ĐH Dầu khí Việt Nam", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 98, "code": "GTS", "name": "ĐH GTVT TP.HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 99, "code": "KCC", "name": "ĐH Kỹ thuật Công nghệ Cần Thơ", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 100, "code": "DLH", "name": "ĐH Lạc Hồng", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 101, "code": "SPK", "name": "ĐH SPKT TP.HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 102, "code": "HCMUTE", "name": "ĐH SPKT TP.HCM", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 103, "code": "VGU", "name": "ĐH Việt Đức", "region": "Miền Nam", "type": "Kỹ thuật"},
  {"stt": 104, "code": "LPS", "name": "ĐH Luật TP.HCM", "region": "Miền Nam", "type": "Luật"},
  {"stt": 105, "code": "MTS", "name": "ĐH Mỹ thuật TP.HCM", "region": "Miền Nam", "type": "Nghệ thuật"},
  {"stt": 106, "code": "DSD", "name": "ĐH Sân khấu Điện ảnh TP.HCM", "region": "Miền Nam", "type": "Nghệ thuật"},
  {"stt": 107, "code": "NLS", "name": "ĐH Nông Lâm TP.HCM", "region": "Miền Nam", "type": "Nông nghiệp"},
  {"stt": 108, "code": "LBH", "name": "ĐH Nguyễn Huệ", "region": "Miền Nam", "type": "Quân sự"},
  {"stt": 109, "code": "VPH", "name": "ĐH Trần Đại Nghĩa", "region": "Miền Nam", "type": "Quân sự"},
  {"stt": 110, "code": "QSQ", "name": "ĐH Quốc tế - ĐHQG HCM", "region": "Miền Nam", "type": "Quốc tế"},
  {"stt": 111, "code": "EIU", "name": "ĐH Quốc tế Miền Đông", "region": "Miền Nam", "type": "Quốc tế"},
  {"stt": 112, "code": "SIU", "name": "ĐH Quốc tế Sài Gòn", "region": "Miền Nam", "type": "Quốc tế"},
  {"stt": 113, "code": "RMIT.HCM", "name": "ĐH RMIT Việt Nam", "region": "Miền Nam", "type": "Quốc tế"},
  {"stt": 114, "code": "HSU", "name": "ĐH Hoa Sen", "region": "Miền Nam", "type": "Quốc tế/Thiết kế"},
  {"stt": 115, "code": "SPS", "name": "ĐH Sư phạm TP.HCM", "region": "Miền Nam", "type": "Sư phạm"},
  {"stt": 116, "code": "SPD", "name": "ĐH Đồng Tháp", "region": "Miền Nam", "type": "Sư phạm"},
  {"stt": 117, "code": "SGD", "name": "ĐH Sài Gòn", "region": "Miền Nam", "type": "Sư phạm/Đa ngành"},
  {"stt": 118, "code": "STS", "name": "ĐH TDTT TP.HCM", "region": "Miền Nam", "type": "Thể thao"},
  {"stt": 119, "code": "NHS", "name": "ĐH Ngân hàng TP.HCM", "region": "Miền Nam", "type": "Tài chính"},
  {"stt": 120, "code": "MTU", "name": "ĐH Xây dựng Miền Tây", "region": "Miền Nam", "type": "Xây dựng"},
  {"stt": 121, "code": "QSX", "name": "ĐH KHXH&NV - ĐHQG HCM", "region": "Miền Nam", "type": "Xã hội"},
  {"stt": 122, "code": "VHS", "name": "ĐH Văn hóa TP.HCM", "region": "Miền Nam", "type": "Xã hội"},
  {"stt": 123, "code": "PNTU", "name": "ĐH Phạm Ngọc Thạch", "region": "Miền Nam", "type": "Y dược"},
  {"stt": 124, "code": "HIU", "name": "ĐH Quốc tế Hồng Bàng", "region": "Miền Nam", "type": "Y dược"},
  {"stt": 125, "code": "YCT2", "name": "ĐH Y Cần Thơ", "region": "Miền Nam", "type": "Y dược"},
  {"stt": 126, "code": "YCT", "name": "ĐH Y Dược Cần Thơ", "region": "Miền Nam", "type": "Y dược"},
  {"stt": 127, "code": "CTUMP", "name": "ĐH Y Dược Cần Thơ", "region": "Miền Nam", "type": "Y dược"},
  {"stt": 128, "code": "YDS", "name": "ĐH Y Dược TP.HCM", "region": "Miền Nam", "type": "Y dược"},
  {"stt": 129, "code": "QSA", "name": "ĐH An Giang", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 130, "code": "AGU", "name": "ĐH An Giang (ĐHQG HCM)", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 131, "code": "BVU", "name": "ĐH Bà Rịa Vũng Tàu", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 132, "code": "DBD", "name": "ĐH Bình Dương", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 133, "code": "DBL", "name": "ĐH Bạc Liêu", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 134, "code": "TCT.CT", "name": "ĐH Cần Thơ", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 135, "code": "DCL", "name": "ĐH Cửu Long", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 136, "code": "GDU", "name": "ĐH Gia Định", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 137, "code": "TKG", "name": "ĐH Kiên Giang", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 138, "code": "DLA2", "name": "ĐH Long An", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 139, "code": "MBS", "name": "ĐH Mở TP.HCM", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 140, "code": "OU", "name": "ĐH Mở TP.HCM", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 141, "code": "DNC", "name": "ĐH Nam Cần Thơ", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 142, "code": "NTT", "name": "ĐH Nguyễn Tất Thành", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 143, "code": "TDM", "name": "ĐH Thủ Dầu Một", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 144, "code": "TTG", "name": "ĐH Tiền Giang", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 145, "code": "DVT", "name": "ĐH Trà Vinh", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 146, "code": "DTD", "name": "ĐH Tây Đô", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 147, "code": "DTT", "name": "ĐH Tôn Đức Thắng", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 148, "code": "VTT", "name": "ĐH Võ Trường Toản", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 149, "code": "DVH", "name": "ĐH Văn Hiến", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 150, "code": "VLU", "name": "ĐH Văn Lang", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 151, "code": "DNU", "name": "ĐH Đồng Nai", "region": "Miền Nam", "type": "Đa ngành"},
  {"stt": 152, "code": "FINAL", "name": "ĐH Tổng hợp Việt Nam (placeholder)", "region": "Toàn quốc", "type": "Đa ngành"}
];

function renderUniversities(filter = {}) {
  const list = document.getElementById('uni-list');
  let filtered = universitiesData.slice(); // work with copy

  if (filter.search) {
    const s = filter.search.toLowerCase();
    filtered = filtered.filter(u => u.name.toLowerCase().includes(s));
  }
  if (filter.region) {
    filtered = filtered.filter(u => u.region === filter.region);
  }
  if (filter.type) {
    filtered = filtered.filter(u => u.type === filter.type);
  }

  document.getElementById('uni-count').textContent = filtered.length;
  list.innerHTML = '';

  filtered.forEach(uni => {
    const item = document.createElement('div');
    item.className = 'p-5 hover:bg-slate-subtle transition-colors cursor-pointer';
    item.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <h4 class="font-semibold text-sm mb-2" style="color:#1a1a1a;">${uni.name}</h4>
          <div class="flex items-center gap-3 flex-wrap mb-3">
            <span class="text-xs px-2.5 py-1 rounded-full" style="background:#F3F2EF; color:#666;">${uni.region}</span>
            <span class="text-xs px-2.5 py-1 rounded-full" style="background:#F3F2EF; color:#666;">${uni.type}</span>
          </div>
          ${uni.website ? `<a href="https://${uni.website}" target="_blank" rel="noopener noreferrer" class="text-xs font-medium transition-colors hover:text-white flex items-center gap-1.5 w-fit px-3 py-1.5 rounded-lg" style="color:#A51C30; background:rgba(165,28,48,0.1);" onclick="event.stopPropagation();">
            <i data-lucide="globe" style="width:12px; height:12px;"></i>
            ${uni.website}
          </a>` : '<span class="text-xs" style="color:#ccc;">Không có website</span>'}
        </div>
      </div>
    `;
    list.appendChild(item);
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="p-8 text-center"><p style="color:#999;">Không tìm thấy trường nào</p></div>';
  }

  lucide.createIcons();
}

function filterUniversities() {
  const search = document.getElementById('uni-search').value;
  const region = document.getElementById('uni-filter-region').value;
  const type = document.getElementById('uni-filter-type').value;
  renderUniversities({ search, region, type });
}

function clearUniFilters() {
  document.getElementById('uni-search').value = '';
  document.getElementById('uni-filter-region').value = '';
  document.getElementById('uni-filter-type').value = '';
  renderUniversities();
}

function viewUniDetail(code) {
  const uni = universitiesData.find(u => u.code === code);
  if (uni) {
    alert(`${uni.name}\n${uni.region} · ${uni.type}\nCode: ${uni.code}`);
  }
}

// Initialize universities list
renderUniversities();
document.getElementById('uni-search').addEventListener('keyup', filterUniversities);
document.getElementById('uni-filter-region').addEventListener('change', filterUniversities);
document.getElementById('uni-filter-type').addEventListener('change', filterUniversities);

// ─── Element SDK ───
const defaultConfig = {
  university_name: 'Làng CS',
  hero_title: 'Hệ thống Tính Điểm Tuyển Sinh 2026',
  hero_subtitle: 'Khám phá cơ hội học tập tại các trường đại học hàng đầu. Tính điểm xét tuyển, tra cứu ngành học và chuẩn bị hồ sơ ngay hôm nay.',
  cta_button_text: 'Tính điểm xét tuyển',
  footer_text: '© 2026 Làng CS. Bảo lưu mọi quyền.',
  background_color: '#A51C30',
  surface_color: '#FAF9F6',
  text_color: '#1a1a1a',
  primary_action_color: '#A51C30',
  secondary_action_color: '#1a1a1a',
  font_family: 'Playfair Display',
  font_size: 16
};

function applyConfig(config) {
  const c = { ...defaultConfig, ...config };

  document.getElementById('nav-uni-name').textContent = c.university_name;
  document.getElementById('hero-title').innerHTML = (c.hero_title || defaultConfig.hero_title).replace(/\n/g, '<br>');
  document.getElementById('hero-subtitle').textContent = c.hero_subtitle;
  document.getElementById('hero-cta-text').textContent = c.cta_button_text;
  document.getElementById('footer-uni-name').textContent = c.university_name;
  document.getElementById('footer-copyright').textContent = c.footer_text;

  const bg = c.background_color;
  document.getElementById('hero').style.background = `linear-gradient(165deg, ${bg} 0%, ${adjustColor(bg, -15)} 60%, ${adjustColor(bg, -30)} 100%)`;
  document.getElementById('nav-logo-bg').style.background = bg;
  document.getElementById('nav-cta').style.background = bg;
  document.getElementById('exam-calc-btn').style.background = bg;
  document.getElementById('transcript-calc-btn').style.background = bg;
  document.getElementById('download-btn').style.background = bg;
  document.getElementById('hero-cta').style.background = bg;

  ['exam-result', 'transcript-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.borderColor = bg; el.style.background = hexToRgba(bg, 0.04); }
  });

  ['exam-total', 'transcript-total', 'results-total-score'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.color = bg;
  });

  ['exam-bar', 'transcript-bar', 'results-progress'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.background = bg;
  });

  const sections = document.querySelectorAll('.bg-ivory');
  sections.forEach(s => s.style.background = c.surface_color);

  const fontFamily = c.font_family || defaultConfig.font_family;
  const baseFontStack = 'Georgia, serif';
  document.querySelectorAll('.font-display').forEach(el => {
    el.style.fontFamily = `${fontFamily}, ${baseFontStack}`;
  });
}

function adjustColor(hex, amount) {
  hex = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function hexToRgba(hex, alpha) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange: async (config) => applyConfig(config),
    mapToCapabilities: (config) => ({
      recolorables: [
        { get: () => config.background_color || defaultConfig.background_color, set: (v) => { config.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
        { get: () => config.surface_color || defaultConfig.surface_color, set: (v) => { config.surface_color = v; window.elementSdk.setConfig({ surface_color: v }); } },
        { get: () => config.text_color || defaultConfig.text_color, set: (v) => { config.text_color = v; window.elementSdk.setConfig({ text_color: v }); } },
        { get: () => config.primary_action_color || defaultConfig.primary_action_color, set: (v) => { config.primary_action_color = v; window.elementSdk.setConfig({ primary_action_color: v }); } },
        { get: () => config.secondary_action_color || defaultConfig.secondary_action_color, set: (v) => { config.secondary_action_color = v; window.elementSdk.setConfig({ secondary_action_color: v }); } }
      ],
      borderables: [],
      fontEditable: {
        get: () => config.font_family || defaultConfig.font_family,
        set: (v) => { config.font_family = v; window.elementSdk.setConfig({ font_family: v }); }
      },
      fontSizeable: {
        get: () => config.font_size || defaultConfig.font_size,
        set: (v) => { config.font_size = v; window.elementSdk.setConfig({ font_size: v }); }
      }
    }),
    mapToEditPanelValues: (config) => new Map([
      ['university_name', config.university_name || defaultConfig.university_name],
      ['hero_title', config.hero_title || defaultConfig.hero_title],
      ['hero_subtitle', config.hero_subtitle || defaultConfig.hero_subtitle],
      ['cta_button_text', config.cta_button_text || defaultConfig.cta_button_text],
      ['footer_text', config.footer_text || defaultConfig.footer_text]
    ])
  });
}

lucide.createIcons();
