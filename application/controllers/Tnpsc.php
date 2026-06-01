<?php
defined('BASEPATH') OR exit('No direct script access allowed');

class Tnpsc extends CI_Controller {

    private $jwt_secret;

    public function __construct() {
        parent::__construct();
        $this->load->database();
        $this->load->library('Jwt');
        $this->jwt_secret = getenv('JWT_SECRET') ?: 'YourSuperSecretKey';
        $this->_cors();
        $this->_migrate_users();
    }

    private function _migrate_users() {
        $cols = [
            'medium'       => "VARCHAR(10) NULL",
            'gender'       => "VARCHAR(10) NULL",
            'age'          => "TINYINT UNSIGNED NULL",
            'district'     => "VARCHAR(100) NULL",
            'otp_verified' => "TINYINT(1) DEFAULT 0",
        ];
        foreach ($cols as $col => $def) {
            $check = $this->db->query("SELECT COUNT(*) as cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME=?", [$col])->row();
            if ($check->cnt == 0) {
                $this->db->query("ALTER TABLE users ADD COLUMN `$col` $def");
            }
        }
        // OTP codes table
        $this->db->query("CREATE TABLE IF NOT EXISTS otp_codes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phone VARCHAR(15) NOT NULL,
            otp VARCHAR(6) NOT NULL,
            purpose VARCHAR(10) DEFAULT 'login',
            expires_at DATETIME NOT NULL,
            used TINYINT(1) DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_phone (phone)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function _cors() {
        header('Access-Control-Allow-Origin: http://localhost:5173');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }

    private function _json($data, $code = 200) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }

    private function _body() {
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }

    private function _method() {
        return strtoupper($_SERVER['REQUEST_METHOD']);
    }

    private function _verify_token() {
        $auth = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
        if (!$auth) $auth = isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '';
        if (!$auth && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        }
        if (!$auth || strpos($auth, 'Bearer ') !== 0) {
            $this->_json(['success' => false, 'error' => 'No token provided'], 401);
        }
        $token = substr($auth, 7);
        try {
            return Jwt::decode($token, $this->jwt_secret);
        } catch (Exception $e) {
            $this->_json(['success' => false, 'error' => 'Invalid token'], 403);
        }
    }

    private function _make_token($payload) {
        $payload['iat'] = time();
        $payload['exp'] = time() + (86400 * 30); // 30 days
        return Jwt::encode($payload, $this->jwt_secret);
    }

    // ── AUTH (OTP-based) ──────────────────────────────────────────────────────

    public function auth_send_otp() {
        $body    = $this->_body();
        $phone   = preg_replace('/\D/', '', $body['phone'] ?? '');
        $purpose = ($body['purpose'] ?? 'login') === 'register' ? 'register' : 'login';

        if (!$phone || strlen($phone) !== 10)
            $this->_json(['success' => false, 'error' => 'Valid 10-digit phone number required'], 400);

        $existing = $this->db->get_where('users', ['phone' => $phone])->row();

        if ($purpose === 'register') {
            if ($existing)
                $this->_json(['success' => false, 'error' => 'Phone number already registered. Please login.'], 409);

            // Create unverified user with profile data
            $name     = trim($body['name'] ?? '') ?: null;
            $email    = trim($body['email'] ?? '') ?: null;
            $medium   = in_array($body['medium'] ?? '', ['tamil','english']) ? $body['medium'] : null;
            $gender   = in_array($body['gender'] ?? '', ['male','female','other']) ? $body['gender'] : null;
            $age      = isset($body['age']) && $body['age'] > 0 ? (int)$body['age'] : null;
            $district = trim($body['district'] ?? '') ?: null;
            $address  = trim($body['address'] ?? '') ?: null;

            $this->db->insert('users', [
                'username'     => $phone,
                'password_hash'=> '',
                'name'         => $name,
                'email'        => $email,
                'phone'        => $phone,
                'medium'       => $medium,
                'gender'       => $gender,
                'age'          => $age,
                'district'     => $district,
                'address'      => $address,
                'otp_verified' => 0,
            ]);
        } else {
            if (!$existing)
                $this->_json(['success' => false, 'error' => 'Phone number not registered. Please register first.'], 404);
        }

        // Invalidate old OTPs for this phone
        $this->db->where('phone', $phone)->where('used', 0)->update('otp_codes', ['used' => 1]);

        // Generate 6-digit OTP
        $otp     = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
        $expires = date('Y-m-d H:i:s', strtotime('+10 minutes'));
        $this->db->insert('otp_codes', ['phone' => $phone, 'otp' => $otp, 'purpose' => $purpose, 'expires_at' => $expires]);

        // In production: send via SMS gateway. Dev: return in response.
        $this->_json(['success' => true, 'message' => "OTP sent to $phone", 'otp' => $otp]);
    }

    public function auth_verify_otp() {
        $body  = $this->_body();
        $phone = preg_replace('/\D/', '', $body['phone'] ?? '');
        $otp   = trim($body['otp'] ?? '');

        if (!$phone || !$otp)
            $this->_json(['success' => false, 'error' => 'Phone and OTP required'], 400);

        $record = $this->db->where('phone', $phone)
            ->where('otp', $otp)->where('used', 0)
            ->where('expires_at >=', date('Y-m-d H:i:s'))
            ->order_by('id', 'DESC')->limit(1)->get('otp_codes')->row();

        if (!$record)
            $this->_json(['success' => false, 'error' => 'Invalid or expired OTP'], 401);

        // Mark OTP used
        $this->db->where('id', $record->id)->update('otp_codes', ['used' => 1]);

        // Get user and mark verified
        $user = $this->db->get_where('users', ['phone' => $phone])->row();
        if (!$user)
            $this->_json(['success' => false, 'error' => 'User not found'], 404);

        $this->db->where('id', $user->id)->update('users', ['otp_verified' => 1]);

        $token = $this->_make_token(['id' => $user->id, 'username' => $phone, 'name' => $user->name ?: $phone]);
        $this->_json(['success' => true, 'token' => $token, 'user' => [
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
        ]]);
    }

    // Keep for backward compatibility — redirects to OTP flow
    public function auth_login() {
        $this->_json(['success' => false, 'error' => 'Password login removed. Use OTP login.'], 410);
    }

    public function auth_register() {
        $this->_json(['success' => false, 'error' => 'Use /api/auth/send-otp with purpose=register'], 410);
    }

    // ── TOPICS (public) ───────────────────────────────────────────────────────

    public function topics() {
        $subject  = $this->input->get('subject');
        $unit     = $this->input->get('unit');
        $priority = $this->input->get('exam_priority');
        $q        = $this->input->get('q');

        $this->db->select('t.*, s.subject_name_tamil, s.subject_name_english');
        $this->db->from('topics t');
        $this->db->join('subjects s', 't.subject_id = s.subject_id');
        if ($subject) {
            $this->db->group_start();
            $this->db->where('t.subject_id', $subject);
            $this->db->or_where('s.subject_name_english', $subject);
            $this->db->or_where('s.subject_name_tamil', $subject);
            $this->db->group_end();
        }
        if ($unit)     $this->db->where('t.unit', $unit);
        if ($priority) $this->db->where('t.exam_priority', $priority);
        if ($q) {
            $like = "%$q%";
            $this->db->group_start();
            $this->db->like('t.topic_name_tamil', $q);
            $this->db->or_like('t.topic_name_english', $q);
            $this->db->or_like('t.summary_tamil', $q);
            $this->db->or_like('t.summary_english', $q);
            $this->db->or_like('s.subject_name_english', $q);
            $this->db->or_like('s.subject_name_tamil', $q);
            $this->db->group_end();
        }
        $topics = $this->db->get()->result();
        $data = array_map(function($t) {
            return [
                'topic_id'            => $t->topic_id,
                'topic_name_tamil'    => $t->topic_name_tamil,
                'topic_name_english'  => $t->topic_name_english,
                'subject_id'          => $t->subject_id,
                'subject_tamil'       => $t->subject_name_tamil,
                'subject_english'     => $t->subject_name_english,
                'unit'                => $t->unit,
                'exam_priority'       => $t->exam_priority,
                'source_type'         => $t->source_type,
                'samacheer_classes'   => $t->samacheer_classes,
                'summary_tamil'       => $t->summary_tamil,
                'summary_english'     => $t->summary_english,
            ];
        }, $topics);
        $this->_json(['success' => true, 'count' => count($data), 'data' => $data]);
    }

    public function topic($id) {
        $row = $this->db->select('t.*, s.subject_name_tamil, s.subject_name_english')
                        ->from('topics t')
                        ->join('subjects s', 't.subject_id = s.subject_id')
                        ->where('t.topic_id', $id)
                        ->get()->row();
        if (!$row) $this->_json(['success' => false, 'error' => "Topic $id not found"], 404);

        $bps    = $this->db->order_by('point_index')->get_where('bullet_points',   ['topic_id' => $id])->result();
        $comps  = $this->db->get_where('vs_comparisons', ['topic_id' => $id])->result();
        $compIds = array_column($comps, 'id');
        $crows  = $compIds ? $this->db->select('cr.*, vc.id as comparison_id')->from('comparison_rows cr')->join('vs_comparisons vc', 'cr.comparison_id = vc.id')->where('vc.topic_id', $id)->get()->result() : [];
        $tricks = $this->db->order_by('trick_index')->get_where('memory_tricks',   ['topic_id' => $id])->result();
        $qs     = $this->db->order_by('question_index')->get_where('questions',    ['topic_id' => $id])->result();
        $qids   = array_column($qs, 'id');
        $opts   = $qids ? $this->db->select('qo.*, q.id as question_id')->from('question_options qo')->join('questions q', 'qo.question_id = q.id')->where('q.topic_id', $id)->order_by('q.question_index')->order_by('qo.option_label')->get()->result() : [];
        $exps   = $qids ? $this->db->select('woe.*, q.id as question_id')->from('wrong_option_explanations woe')->join('questions q', 'woe.question_id = q.id')->where('q.topic_id', $id)->get()->result() : [];
        $fcs    = $this->db->order_by('card_index')->get_where('topic_flashcards', ['topic_id' => $id])->result();
        $hes    = $this->db->order_by('error_index')->get_where('topic_human_errors', ['topic_id' => $id])->result();

        $exam_prediction = null;
        if (!empty($row->exam_prediction_json)) {
            $exam_prediction = json_decode($row->exam_prediction_json, true);
        }

        $pyq = array_map(function($q) use ($opts, $exps) {
            $qopts = array_filter($opts, fn($o) => $o->question_id == $q->id);
            $qexps = array_filter($exps, fn($e) => $e->question_id == $q->id);
            $wrongExps = [];
            foreach ($qexps as $e) $wrongExps[$e->option_label] = $e->explanation;
            $optArr = array_values($qopts);
            return [
                'id'                      => $q->question_index,
                'db_id'                   => $q->id,
                'question_tamil'          => $q->question_tamil,
                'question_english'        => $q->question_english,
                'options'                 => array_map(fn($o) => "$o->option_label) $o->option_text", $optArr),
                'option_details'          => array_map(fn($o) => ['label' => $o->option_label, 'text' => $o->option_text], $optArr),
                'correct_option'          => $q->correct_option,
                'correct_answer_tamil'    => $q->correct_answer_tamil,
                'correct_answer_english'  => $q->correct_answer_english,
                'wrong_option_explanations' => $wrongExps,
                'pyq_verified'            => (bool)$q->pyq_verified,
                'year'                    => $q->year,
                'difficulty'              => $q->difficulty,
                'question_type'           => $q->question_type,
            ];
        }, $qs);

        $this->_json(['success' => true, 'data' => [
            'topic_id'                  => $row->topic_id,
            'topic_name_tamil'          => $row->topic_name_tamil,
            'topic_name_english'        => $row->topic_name_english,
            'subject_id'                => $row->subject_id,
            'subject_tamil'             => $row->subject_name_tamil,
            'subject_english'           => $row->subject_name_english,
            'unit'                      => $row->unit,
            'exam_priority'             => $row->exam_priority,
            'source_type'               => $row->source_type,
            'samacheer_classes'         => $row->samacheer_classes,
            'summary'                   => ['tamil' => $row->summary_tamil, 'english' => $row->summary_english],
            'ai_note_tamil'             => $row->ai_note_tamil ?? '',
            'predicted_question_tamil'  => $row->predicted_question_tamil ?? '',
            'predicted_question_english'=> $row->predicted_question_english ?? '',
            'exam_prediction'           => $exam_prediction,
            'bullet_points'             => array_map(fn($b) => [
                'id'            => $b->point_index,
                'point_tamil'   => $b->point_tamil,
                'point_english' => $b->point_english,
                'is_number_fact'=> (bool)$b->is_number_fact,
                'key_number'    => $b->key_number,
                'samacheer_ref' => $b->samacheer_ref,
                'category'      => $b->category,
            ], $bps),
            'flashcards'    => array_map(fn($f) => [
                'id'            => $f->card_index,
                'front_tamil'   => $f->front_tamil,
                'back_tamil'    => $f->back_tamil,
                'front_english' => $f->front_english,
                'back_english'  => $f->back_english,
                'card_type'     => $f->card_type,
            ], $fcs),
            'human_errors'  => array_map(fn($h) => [
                'id'                   => $h->error_index,
                'wrong_answer_tamil'   => $h->wrong_answer_tamil,
                'correct_answer_tamil' => $h->correct_answer_tamil,
                'why_mistake_tamil'    => $h->why_mistake_tamil,
                'memory_tip_tamil'     => $h->memory_tip_tamil,
            ], $hes),
            'vs_comparisons'=> array_map(fn($c) => [
                'title_tamil'   => $c->title_tamil,
                'title_english' => $c->title_english,
                'rows'          => array_values(array_map(fn($r) => [
                    'feature' => $r->feature,
                    'item_a'  => $r->item_a,
                    'item_b'  => $r->item_b,
                ], array_filter($crows, fn($r) => $r->comparison_id == $c->id))),
            ], $comps),
            'memory_tricks' => array_map(fn($t) => [
                'id'              => $t->trick_index,
                'fact_to_remember'=> $t->fact_to_remember,
                'trick_tamil'     => $t->trick_tamil,
                'trick_english'   => $t->trick_english,
                'type'            => $t->type,
            ], $tricks),
            'pyq_questions' => $pyq,
        ]]);
    }

    public function topic_questions($id) {
        $qs   = $this->db->order_by('question_index')->get_where('questions', ['topic_id' => $id])->result();
        $opts = $this->db->select('qo.*, q.id as question_id')->from('question_options qo')->join('questions q', 'qo.question_id = q.id')->where('q.topic_id', $id)->order_by('q.question_index')->order_by('qo.option_label')->get()->result();
        $exps = $this->db->select('woe.*, q.id as question_id')->from('wrong_option_explanations woe')->join('questions q', 'woe.question_id = q.id')->where('q.topic_id', $id)->get()->result();
        $data = array_map(function($q) use ($opts, $exps) {
            $qopts = array_values(array_filter($opts, fn($o) => $o->question_id == $q->id));
            $qexps = array_filter($exps, fn($e) => $e->question_id == $q->id);
            $wrongExps = [];
            foreach ($qexps as $e) $wrongExps[$e->option_label] = $e->explanation;
            return [
                'id'                      => $q->question_index,
                'question_tamil'          => $q->question_tamil,
                'question_english'        => $q->question_english,
                'options'                 => array_map(fn($o) => "$o->option_label) $o->option_text", $qopts),
                'option_details'          => array_map(fn($o) => ['label' => $o->option_label, 'text' => $o->option_text], $qopts),
                'correct_option'          => $q->correct_option,
                'correct_answer_tamil'    => $q->correct_answer_tamil,
                'correct_answer_english'  => $q->correct_answer_english,
                'wrong_option_explanations' => $wrongExps,
                'pyq_verified'            => (bool)$q->pyq_verified,
                'year'                    => $q->year,
                'difficulty'              => $q->difficulty,
                'question_type'           => $q->question_type,
            ];
        }, $qs);
        $this->_json(['success' => true, 'count' => count($data), 'data' => $data]);
    }

    // ── DASHBOARD ─────────────────────────────────────────────────────────────

    public function dashboard_counts() {
        $totals = [
            'topics'        => $this->db->count_all('topics'),
            'questions'     => $this->db->count_all('questions'),
            'flashcards'    => $this->db->count_all('topic_flashcards'),
            'bullet_points' => $this->db->count_all('bullet_points'),
            'memory_tricks' => $this->db->count_all('memory_tricks'),
            'human_errors'  => $this->db->count_all('topic_human_errors'),
            'vs_comparisons'=> $this->db->count_all('vs_comparisons'),
        ];
        $by_subject = $this->db->select('s.subject_id, s.subject_name_english, s.subject_name_tamil, COUNT(t.topic_id) as topic_count, COUNT(q.id) as question_count')
            ->from('subjects s')
            ->join('topics t', 't.subject_id = s.subject_id', 'left')
            ->join('questions q', 'q.topic_id = t.topic_id', 'left')
            ->group_by('s.subject_id, s.subject_name_english, s.subject_name_tamil')
            ->order_by('topic_count', 'DESC')
            ->get()->result();
        $by_priority = $this->db->select('exam_priority, COUNT(*) as count')->from('topics')->group_by('exam_priority')->get()->result();
        $by_difficulty = $this->db->select('difficulty, COUNT(*) as count')->from('questions')->where('difficulty IS NOT NULL')->where("difficulty !=", '')->group_by('difficulty')->order_by('count', 'DESC')->get()->result();
        $this->_json(['success' => true, 'data' => ['totals' => $totals, 'by_subject' => $by_subject, 'by_priority' => $by_priority, 'by_difficulty' => $by_difficulty]]);
    }

    // ── SUBJECTS (protected) ──────────────────────────────────────────────────

    public function subjects() {
        $this->_verify_token();
        $data = $this->db->get('subjects')->result();
        $this->_json(['success' => true, 'data' => $data]);
    }

    public function subjects_topics($subject_id) {
        $this->_verify_token();
        $data = $this->db->get_where('topics', ['subject_id' => $subject_id])->result();
        $this->_json(['success' => true, 'data' => $data]);
    }

    // ── USER PROFILE ──────────────────────────────────────────────────────────

    public function user_profile() {
        $user = $this->_verify_token();
        if ($this->_method() === 'PUT') {
            $body   = $this->_body();
            $phone  = trim($body['phone'] ?? '');
            if ($phone && !preg_match('/^\d{10}$/', $phone))
                $this->_json(['success' => false, 'error' => 'Valid 10-digit phone number required'], 400);
            $this->db->where('id', $user['id'])->update('users', [
                'name'     => trim($body['name'] ?? '') ?: null,
                'phone'    => $phone ?: null,
                'medium'   => in_array($body['medium'] ?? '', ['tamil','english']) ? $body['medium'] : null,
                'gender'   => in_array($body['gender'] ?? '', ['male','female','other']) ? $body['gender'] : null,
                'age'      => isset($body['age']) && $body['age'] > 0 ? (int)$body['age'] : null,
                'district' => trim($body['district'] ?? '') ?: null,
                'street'   => trim($body['street'] ?? '') ?: null,
                'door_no'  => trim($body['door_no'] ?? '') ?: null,
            ]);
            $this->_json(['success' => true]);
        }
        $row = $this->db->get_where('users', ['id' => $user['id']])->row();
        if (!$row) $this->_json(['success' => false, 'error' => 'User not found'], 404);
        $this->_json(['success' => true, 'data' => [
            'id'         => $row->id,
            'username'   => $row->username,
            'name'       => $row->name,
            'email'      => $row->email,
            'phone'      => $row->phone,
            'medium'     => $row->medium ?? null,
            'gender'     => $row->gender ?? null,
            'age'        => $row->age ?? null,
            'district'   => $row->district ?? null,
            'street'     => $row->street ?? null,
            'door_no'    => $row->door_no ?? null,
            'created_at' => $row->created_at,
        ]]);
    }

    // ── USER PROGRESS ─────────────────────────────────────────────────────────

    public function user_progress() {
        $user = $this->_verify_token();
        if ($this->_method() === 'POST') {
            $body = $this->_body();
            $this->db->query(
                'INSERT INTO user_topic_progress (user_id, topic_id, completed) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE completed = VALUES(completed)',
                [$user['id'], $body['topic_id'], $body['completed'] ? 1 : 0]
            );
            $this->_json(['success' => true]);
        }
        $rows = $this->db->select('utp.topic_id, utp.completed, utp.updated_at, t.topic_name_english, t.topic_name_tamil, t.subject_id, t.unit, t.exam_priority, s.subject_name_english, s.subject_name_tamil')
            ->from('user_topic_progress utp')
            ->join('topics t', 'utp.topic_id = t.topic_id')
            ->join('subjects s', 't.subject_id = s.subject_id')
            ->where('utp.user_id', $user['id'])
            ->get()->result();
        $this->_json(['success' => true, 'data' => $rows]);
    }

    // ── EXAM ATTEMPTS ─────────────────────────────────────────────────────────

    public function exam_attempts() {
        $user = $this->_verify_token();
        if ($this->_method() === 'POST') {
            $body = $this->_body();
            if (empty($body['topic_id'])) $this->_json(['success' => false, 'error' => 'topic_id required'], 400);
            $this->db->insert('exam_attempts', ['user_id' => $user['id'], 'topic_id' => $body['topic_id'], 'score' => $body['score'] ?? 0, 'total_questions' => $body['total_questions'] ?? 0, 'correct_answers' => $body['correct_answers'] ?? 0, 'time_taken' => $body['time_taken'] ?? 0]);
            $this->_json(['success' => true, 'id' => $this->db->insert_id()]);
        }
        $rows = $this->db->select('ea.*, t.topic_name_english, t.topic_name_tamil, s.subject_name_english')
            ->from('exam_attempts ea')
            ->join('topics t', 'ea.topic_id = t.topic_id')
            ->join('subjects s', 't.subject_id = s.subject_id')
            ->where('ea.user_id', $user['id'])
            ->order_by('ea.created_at', 'DESC')
            ->limit(50)->get()->result();
        $this->_json(['success' => true, 'data' => $rows]);
    }

    // ── USER STATS ────────────────────────────────────────────────────────────

    public function user_stats() {
        $user = $this->_verify_token();
        $completed   = $this->db->where('user_id', $user['id'])->where('completed', 1)->count_all_results('user_topic_progress');
        $total       = $this->db->count_all('topics');
        $examRow     = $this->db->select('COUNT(*) as total, AVG(score) as avg_score')->where('user_id', $user['id'])->get('exam_attempts')->row();
        $subjectProgress = $this->db->select('s.subject_id, s.subject_name_english, s.subject_name_tamil, COUNT(t.topic_id) as total_topics, SUM(CASE WHEN utp.completed=1 THEN 1 ELSE 0 END) as completed_topics')
            ->from('subjects s')
            ->join('topics t', 't.subject_id = s.subject_id')
            ->join('user_topic_progress utp', "utp.topic_id = t.topic_id AND utp.user_id = {$user['id']}", 'left')
            ->group_by('s.subject_id')
            ->get()->result();
        $this->_json(['success' => true, 'data' => [
            'topics_completed'  => (int)$completed,
            'total_topics'      => (int)$total,
            'exams_taken'       => (int)($examRow->total ?? 0),
            'avg_score'         => (int)round($examRow->avg_score ?? 0),
            'subject_progress'  => $subjectProgress,
        ]]);
    }

    // ── WRONG ANSWERS ─────────────────────────────────────────────────────────

    public function wrong_answers() {
        $user = $this->_verify_token();
        if ($this->_method() === 'POST') {
            $body = $this->_body();
            if (empty($body['question_id']) || empty($body['selected_option'])) {
                $this->_json(['success' => false, 'error' => 'question_id and selected_option required'], 400);
            }
            $this->db->query(
                'INSERT INTO wrong_answers (user_id, question_id, selected_option, attempt_count, mastered) VALUES (?,?,?,1,0) ON DUPLICATE KEY UPDATE selected_option=VALUES(selected_option), attempt_count=attempt_count+1, mastered=0, last_wrong_at=CURRENT_TIMESTAMP',
                [$user['id'], $body['question_id'], $body['selected_option']]
            );
            $this->_json(['success' => true]);
        }
        $mastered = $this->input->get('mastered');
        $this->db->select('wa.id, wa.question_id, wa.selected_option, wa.attempt_count, wa.mastered, wa.last_wrong_at, q.question_tamil, q.question_english, q.correct_option, q.correct_answer_tamil, q.correct_answer_english, q.topic_id, q.difficulty, q.year, t.topic_name_tamil, t.topic_name_english, s.subject_name_english, s.subject_name_tamil')
            ->from('wrong_answers wa')
            ->join('questions q', 'wa.question_id = q.id')
            ->join('topics t', 'q.topic_id = t.topic_id')
            ->join('subjects s', 't.subject_id = s.subject_id')
            ->where('wa.user_id', $user['id']);
        if ($mastered !== null) $this->db->where('wa.mastered', (int)$mastered);
        $rows = $this->db->order_by('wa.attempt_count', 'DESC')->order_by('wa.last_wrong_at', 'DESC')->get()->result();
        if (!$rows) { $this->_json(['success' => true, 'count' => 0, 'data' => []]); }
        $qids = array_unique(array_column($rows, 'question_id'));
        $opts = $this->db->where_in('question_id', $qids)->order_by('option_label')->get('question_options')->result();
        $optMap = [];
        foreach ($opts as $o) $optMap[$o->question_id][] = ['label' => $o->option_label, 'text' => $o->option_text];
        $data = array_map(fn($r) => array_merge((array)$r, ['options' => $optMap[$r->question_id] ?? []]), $rows);
        $this->_json(['success' => true, 'count' => count($data), 'data' => $data]);
    }

    public function wrong_answers_master($question_id) {
        $user = $this->_verify_token();
        $this->db->where('user_id', $user['id'])->where('question_id', $question_id)->update('wrong_answers', ['mastered' => 1]);
        $this->_json(['success' => true]);
    }

    // ── SRS ───────────────────────────────────────────────────────────────────

    public function srs_due() {
        $user  = $this->_verify_token();
        $today = date('Y-m-d');
        $limit = (int)($this->input->get('limit') ?: 20);
        $due   = $this->db->select('sr.id as srs_id, sr.flashcard_id, sr.ease_factor, sr.interval_days, sr.repetitions, sr.due_date, tf.front_tamil, tf.back_tamil, tf.front_english, tf.back_english, tf.card_type, t.topic_id, t.topic_name_tamil, t.topic_name_english, s.subject_name_english')
            ->from('srs_reviews sr')
            ->join('topic_flashcards tf', 'sr.flashcard_id = tf.id')
            ->join('topics t', 'tf.topic_id = t.topic_id')
            ->join('subjects s', 't.subject_id = s.subject_id')
            ->where('sr.user_id', $user['id'])->where('sr.due_date <=', $today)
            ->order_by('sr.due_date')->limit($limit)->get()->result();
        $new_cards = [];
        if (count($due) < $limit) {
            $new_cards = $this->db->select('tf.id as flashcard_id, tf.front_tamil, tf.back_tamil, tf.front_english, tf.back_english, tf.card_type, t.topic_id, t.topic_name_tamil, t.topic_name_english, s.subject_name_english')
                ->from('topic_flashcards tf')
                ->join('topics t', 'tf.topic_id = t.topic_id')
                ->join('subjects s', 't.subject_id = s.subject_id')
                ->where("tf.id NOT IN (SELECT flashcard_id FROM srs_reviews WHERE user_id = {$user['id']})")
                ->order_by('RAND()')->limit($limit - count($due))->get()->result();
        }
        $this->_json(['success' => true, 'due' => $due, 'new_cards' => $new_cards]);
    }

    public function srs_review() {
        $user = $this->_verify_token();
        $body = $this->_body();
        $flashcard_id = $body['flashcard_id'] ?? null;
        $quality      = $body['quality'] ?? null;
        if ($flashcard_id === null || $quality === null) $this->_json(['success' => false, 'error' => 'flashcard_id and quality (0-5) required'], 400);
        if ($quality < 0 || $quality > 5) $this->_json(['success' => false, 'error' => 'quality must be 0-5'], 400);
        $existing = $this->db->get_where('srs_reviews', ['user_id' => $user['id'], 'flashcard_id' => $flashcard_id])->row();
        $ef = $existing ? $existing->ease_factor : 2.5;
        $iv = $existing ? $existing->interval_days : 1;
        $rp = $existing ? $existing->repetitions : 0;
        [$newEF, $newIV, $newRep] = $this->_sm2($ef, $iv, $rp, $quality);
        $due = date('Y-m-d', strtotime("+$newIV days"));
        $this->db->query(
            'INSERT INTO srs_reviews (user_id, flashcard_id, ease_factor, interval_days, repetitions, due_date, last_reviewed_at) VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE ease_factor=VALUES(ease_factor), interval_days=VALUES(interval_days), repetitions=VALUES(repetitions), due_date=VALUES(due_date), last_reviewed_at=CURRENT_TIMESTAMP',
            [$user['id'], $flashcard_id, $newEF, $newIV, $newRep, $due]
        );
        $this->_json(['success' => true, 'next_review' => $due, 'interval_days' => $newIV]);
    }

    public function srs_stats() {
        $user  = $this->_verify_token();
        $today = date('Y-m-d');
        $due   = $this->db->where('user_id', $user['id'])->where('due_date <=', $today)->count_all_results('srs_reviews');
        $total = $this->db->where('user_id', $user['id'])->count_all_results('srs_reviews');
        $mast  = $this->db->where('user_id', $user['id'])->where('interval_days >=', 21)->count_all_results('srs_reviews');
        $this->_json(['success' => true, 'data' => ['due_today' => $due, 'total_in_srs' => $total, 'mastered' => $mast]]);
    }

    private function _sm2($ef, $iv, $rp, $q) {
        $newEF = $ef + (0.1 - (5 - $q) * (0.08 + (5 - $q) * 0.02));
        if ($newEF < 1.3) $newEF = 1.3;
        if ($q < 3) { return [$ef, 1, 0]; }
        $newRep = $rp + 1;
        if ($newRep === 1)     $newIV = 1;
        elseif ($newRep === 2) $newIV = 6;
        else                   $newIV = (int)round($iv * $ef);
        return [$newEF, $newIV, $newRep];
    }

    // ── MOCK TESTS ────────────────────────────────────────────────────────────

    public function mock_generate() {
        $user = $this->_verify_token();
        $body = $this->_body();
        $num  = $body['num_questions'] ?? 100;
        $time = $body['time_limit'] ?? 5400;
        $sids = $body['subject_ids'] ?? [];
        $this->db->select('q.id')->from('questions q')->join('topics t', 'q.topic_id = t.topic_id');
        if ($sids) $this->db->where_in('t.subject_id', $sids);
        $qIds = $this->db->order_by('RAND()')->limit($num)->get()->result();
        if (!$qIds) $this->_json(['success' => false, 'error' => 'No questions found'], 400);
        $title = $body['title'] ?: ('Mock Test – ' . date('d/m/Y'));
        $this->db->insert('mock_tests', ['user_id' => $user['id'], 'title' => $title, 'total_questions' => count($qIds), 'time_limit' => $time]);
        $testId = $this->db->insert_id();
        foreach ($qIds as $i => $q) {
            $this->db->insert('mock_test_questions', ['mock_test_id' => $testId, 'question_id' => $q->id, 'question_order' => $i + 1]);
        }
        $this->_json(['success' => true, 'mock_test_id' => $testId, 'total_questions' => count($qIds), 'time_limit' => $time]);
    }

    public function mock_get($id) {
        $user = $this->_verify_token();
        $test = $this->db->get_where('mock_tests', ['id' => $id, 'user_id' => $user['id']])->row();
        if (!$test) $this->_json(['success' => false, 'error' => 'Mock test not found'], 404);
        $questions = $this->db->select('mtq.id as slot_id, mtq.question_order, mtq.selected_option, mtq.is_correct, q.id as question_id, q.question_tamil, q.question_english, q.correct_option, q.correct_answer_tamil, q.correct_answer_english, q.difficulty, q.year, q.topic_id, t.topic_name_english, s.subject_name_english')
            ->from('mock_test_questions mtq')
            ->join('questions q', 'mtq.question_id = q.id')
            ->join('topics t', 'q.topic_id = t.topic_id')
            ->join('subjects s', 't.subject_id = s.subject_id')
            ->where('mtq.mock_test_id', $id)->order_by('mtq.question_order')->get()->result();
        $opts = $this->db->select('qo.question_id, qo.option_label, qo.option_text')
            ->from('question_options qo')
            ->join('mock_test_questions mtq', 'qo.question_id = mtq.question_id')
            ->where('mtq.mock_test_id', $id)->get()->result();
        $optMap = [];
        foreach ($opts as $o) $optMap[$o->question_id][] = ['label' => $o->option_label, 'text' => $o->option_text];
        $isPending = $test->status === 'pending';
        $formatted = array_map(function($q) use ($optMap, $isPending) {
            $base = ['slot_id' => $q->slot_id, 'question_order' => $q->question_order, 'question_id' => $q->question_id, 'question_tamil' => $q->question_tamil, 'question_english' => $q->question_english, 'options' => $optMap[$q->question_id] ?? [], 'difficulty' => $q->difficulty, 'year' => $q->year, 'topic_name_english' => $q->topic_name_english, 'subject_name_english' => $q->subject_name_english, 'selected_option' => $q->selected_option];
            if (!$isPending) $base = array_merge($base, ['correct_option' => $q->correct_option, 'correct_answer_tamil' => $q->correct_answer_tamil, 'correct_answer_english' => $q->correct_answer_english, 'is_correct' => $q->is_correct]);
            return $base;
        }, $questions);
        $this->_json(['success' => true, 'data' => array_merge((array)$test, ['questions' => $formatted])]);
    }

    public function mock_submit($id) {
        $user = $this->_verify_token();
        $body = $this->_body();
        $answers = $body['answers'] ?? [];
        if (!is_array($answers)) $this->_json(['success' => false, 'error' => 'answers array required'], 400);
        $test = $this->db->get_where('mock_tests', ['id' => $id, 'user_id' => $user['id']])->row();
        if (!$test) $this->_json(['success' => false, 'error' => 'Mock test not found'], 404);
        if ($test->status === 'completed') $this->_json(['success' => false, 'error' => 'Test already submitted'], 400);
        $questions = $this->db->select('mtq.id as slot_id, mtq.question_id, q.correct_option')
            ->from('mock_test_questions mtq')->join('questions q', 'mtq.question_id = q.id')
            ->where('mtq.mock_test_id', $id)->get()->result();
        $correct = 0;
        foreach ($questions as $q) {
            $ans = null;
            foreach ($answers as $a) { if ($a['question_id'] == $q->question_id) { $ans = $a['selected_option']; break; } }
            $isCorrect = ($ans === $q->correct_option) ? 1 : 0;
            if ($isCorrect) $correct++;
            $this->db->where('id', $q->slot_id)->update('mock_test_questions', ['selected_option' => $ans, 'is_correct' => $isCorrect]);
            if ($ans && !$isCorrect) {
                $this->db->query('INSERT INTO wrong_answers (user_id, question_id, selected_option, attempt_count, mastered) VALUES (?,?,?,1,0) ON DUPLICATE KEY UPDATE selected_option=VALUES(selected_option), attempt_count=attempt_count+1, mastered=0, last_wrong_at=CURRENT_TIMESTAMP', [$user['id'], $q->question_id, $ans]);
            }
        }
        $score = count($questions) > 0 ? round($correct / count($questions) * 100) : 0;
        $this->db->where('id', $id)->update('mock_tests', ['score' => $score, 'correct_answers' => $correct, 'time_taken' => $body['time_taken'] ?? 0, 'status' => 'completed', 'completed_at' => date('Y-m-d H:i:s')]);
        $this->_json(['success' => true, 'score' => $score, 'correct_answers' => $correct, 'total_questions' => count($questions)]);
    }

    public function mock_list() {
        $user = $this->_verify_token();
        $rows = $this->db->where('user_id', $user['id'])->order_by('created_at', 'DESC')->limit(20)->get('mock_tests')->result();
        $this->_json(['success' => true, 'data' => $rows]);
    }

    // ── BOOKMARKS ─────────────────────────────────────────────────────────────

    public function bookmarks() {
        $user = $this->_verify_token();
        if ($this->_method() === 'POST') {
            $body = $this->_body();
            if (empty($body['item_type']) || empty($body['item_id']) || !in_array($body['item_type'], ['question','flashcard'])) {
                $this->_json(['success' => false, 'error' => 'item_type (question|flashcard) and item_id required'], 400);
            }
            $this->db->query('INSERT IGNORE INTO bookmarks (user_id, item_type, item_id) VALUES (?,?,?)', [$user['id'], $body['item_type'], $body['item_id']]);
            $this->_json(['success' => true]);
        }
        $type = $this->input->get('type');
        $result = [];
        if (!$type || $type === 'question') {
            $qs = $this->db->select('b.id as bookmark_id, b.created_at as bookmarked_at, q.id as question_id, q.question_tamil, q.question_english, q.correct_option, q.correct_answer_tamil, q.difficulty, q.year, t.topic_name_english, s.subject_name_english')
                ->from('bookmarks b')->join('questions q', 'b.item_id = q.id')->join('topics t', 'q.topic_id = t.topic_id')->join('subjects s', 't.subject_id = s.subject_id')
                ->where('b.user_id', $user['id'])->where('b.item_type', 'question')->order_by('b.created_at', 'DESC')->get()->result();
            if ($qs) {
                $qids = array_column($qs, 'question_id');
                $opts = $this->db->where_in('question_id', $qids)->order_by('option_label')->get('question_options')->result();
                $optMap = [];
                foreach ($opts as $o) $optMap[$o->question_id][] = ['label' => $o->option_label, 'text' => $o->option_text];
                foreach ($qs as $q) $q->options = $optMap[$q->question_id] ?? [];
            }
            $result['questions'] = $qs;
        }
        if (!$type || $type === 'flashcard') {
            $result['flashcards'] = $this->db->select('b.id as bookmark_id, b.created_at as bookmarked_at, tf.id as flashcard_id, tf.front_tamil, tf.back_tamil, tf.front_english, tf.back_english, tf.card_type, t.topic_name_english, s.subject_name_english')
                ->from('bookmarks b')->join('topic_flashcards tf', 'b.item_id = tf.id')->join('topics t', 'tf.topic_id = t.topic_id')->join('subjects s', 't.subject_id = s.subject_id')
                ->where('b.user_id', $user['id'])->where('b.item_type', 'flashcard')->order_by('b.created_at', 'DESC')->get()->result();
        }
        $this->_json(['success' => true, 'data' => $result]);
    }

    public function bookmarks_item($id) {
        $user = $this->_verify_token();
        $this->db->where('id', $id)->where('user_id', $user['id'])->delete('bookmarks');
        $this->_json(['success' => true]);
    }

    // ── ACTIVITY / STREAK / GOALS ─────────────────────────────────────────────

    public function user_activity() {
        $user = $this->_verify_token();
        $body = $this->_body();
        $today = date('Y-m-d');
        $this->db->query(
            'INSERT INTO daily_activity (user_id, activity_date, questions_answered, topics_studied, flashcards_reviewed) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE questions_answered=questions_answered+VALUES(questions_answered), topics_studied=topics_studied+VALUES(topics_studied), flashcards_reviewed=flashcards_reviewed+VALUES(flashcards_reviewed)',
            [$user['id'], $today, $body['questions_answered'] ?? 0, $body['topics_studied'] ?? 0, $body['flashcards_reviewed'] ?? 0]
        );
        $this->_json(['success' => true]);
    }

    public function user_streak() {
        $user  = $this->_verify_token();
        $rows  = $this->db->select('activity_date')->where('user_id', $user['id'])->order_by('activity_date', 'DESC')->get('daily_activity')->result();
        $dates = array_map(fn($r) => strtotime($r->activity_date), $rows);
        $today = strtotime(date('Y-m-d'));
        $currentStreak = 0; $expected = $today;
        foreach ($dates as $d) {
            if ($d === $expected) { $currentStreak++; $expected -= 86400; }
            elseif ($d === $today - 86400 && $currentStreak === 0) { $currentStreak++; $expected = $d - 86400; }
            else break;
        }
        $longestStreak = 0; $tempStreak = 0; $prevDate = null;
        foreach (array_reverse($dates) as $d) {
            if (!$prevDate || ($d - $prevDate) === 86400) { $tempStreak++; $longestStreak = max($longestStreak, $tempStreak); }
            else $tempStreak = 1;
            $prevDate = $d;
        }
        $todayActivity = $this->db->get_where('daily_activity', ['user_id' => $user['id'], 'activity_date' => date('Y-m-d')])->row();
        $goals = $this->db->get_where('user_goals', ['user_id' => $user['id']])->row();
        $this->_json(['success' => true, 'data' => [
            'current_streak'  => $currentStreak,
            'longest_streak'  => $longestStreak,
            'today'           => $todayActivity ?: ['questions_answered' => 0, 'topics_studied' => 0, 'flashcards_reviewed' => 0],
            'goals'           => $goals ?: ['daily_questions_goal' => 20, 'daily_topics_goal' => 5, 'daily_flashcards_goal' => 10, 'exam_date' => null],
        ]]);
    }

    public function user_goals() {
        $user = $this->_verify_token();
        if ($this->_method() === 'PUT') {
            $body = $this->_body();
            $this->db->query(
                'INSERT INTO user_goals (user_id, daily_questions_goal, daily_topics_goal, daily_flashcards_goal, exam_date) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE daily_questions_goal=VALUES(daily_questions_goal), daily_topics_goal=VALUES(daily_topics_goal), daily_flashcards_goal=VALUES(daily_flashcards_goal), exam_date=VALUES(exam_date)',
                [$user['id'], $body['daily_questions_goal'] ?? 20, $body['daily_topics_goal'] ?? 5, $body['daily_flashcards_goal'] ?? 10, $body['exam_date'] ?? null]
            );
            $this->_json(['success' => true]);
        }
        $row = $this->db->get_where('user_goals', ['user_id' => $user['id']])->row();
        $this->_json(['success' => true, 'data' => $row ?: ['daily_questions_goal' => 20, 'daily_topics_goal' => 5, 'daily_flashcards_goal' => 10, 'exam_date' => null]]);
    }

    // ── PYQ ───────────────────────────────────────────────────────────────────

    public function pyq_years() {
        $rows = $this->db->select('DISTINCT year')->where('year IS NOT NULL')->where("year !=", '')->order_by('year', 'DESC')->get('questions')->result();
        $this->_json(['success' => true, 'data' => array_column($rows, 'year')]);
    }

    public function pyq_questions() {
        $year       = $this->input->get('year');
        $subject_id = $this->input->get('subject_id');
        $limit      = (int)($this->input->get('limit') ?: 50);
        $offset     = (int)($this->input->get('offset') ?: 0);
        $this->db->select('q.id, q.question_tamil, q.question_english, q.correct_option, q.correct_answer_tamil, q.correct_answer_english, q.difficulty, q.year, q.question_type, t.topic_id, t.topic_name_english, t.topic_name_tamil, s.subject_id, s.subject_name_english, s.subject_name_tamil')
            ->from('questions q')->join('topics t', 'q.topic_id = t.topic_id')->join('subjects s', 't.subject_id = s.subject_id')
            ->where('q.pyq_verified', 1);
        if ($year)       $this->db->where('q.year', $year);
        if ($subject_id) $this->db->where('s.subject_id', $subject_id);
        $questions = $this->db->order_by('q.year', 'DESC')->order_by('q.id')->limit($limit, $offset)->get()->result();
        $ids = array_column($questions, 'id');
        $optMap = [];
        if ($ids) {
            $opts = $this->db->where_in('question_id', $ids)->order_by('option_label')->get('question_options')->result();
            foreach ($opts as $o) $optMap[$o->question_id][] = ['label' => $o->option_label, 'text' => $o->option_text];
        }
        $data = array_map(fn($q) => array_merge((array)$q, ['options' => $optMap[$q->id] ?? []]), $questions);
        $this->_json(['success' => true, 'count' => count($data), 'data' => $data]);
    }

    // ── PYQ2 ──────────────────────────────────────────────────────────────────

    public function pyq2_years() {
        $rows = $this->db->select('p.id, p.year, p.exam_code, p.label, SUM(CASE WHEN q.medium="tamil" THEN 1 ELSE 0 END) AS tamil_count, SUM(CASE WHEN q.medium="english" THEN 1 ELSE 0 END) AS english_count, COUNT(q.id) AS total_count')
            ->from('pyq_papers p')->join('pyq_questions q', 'q.paper_id = p.id', 'left')
            ->group_by('p.id')->order_by('p.year', 'DESC')->get()->result();
        $this->_json(['success' => true, 'data' => $rows]);
    }

    public function pyq2_questions() {
        $year   = $this->input->get('year');
        $medium = $this->input->get('medium');
        if (!$year) $this->_json(['success' => false, 'error' => 'year required'], 400);
        $paper = $this->db->get_where('pyq_papers', ['year' => (int)$year])->row();
        if (!$paper) $this->_json(['success' => true, 'data' => []]);
        $this->db->select('q.id, q.q_no, q.question_text, q.correct_option, q.medium, q.difficulty')->from('pyq_questions q')->where('q.paper_id', $paper->id);
        if ($medium && $medium !== 'all') $this->db->where('q.medium', $medium);
        $questions = $this->db->order_by('q.q_no')->get()->result();
        if (!$questions) $this->_json(['success' => true, 'data' => []]);
        $qids = array_column($questions, 'id');
        $opts = $this->db->where_in('question_id', $qids)->order_by('option_label')->get('pyq_options')->result();
        $optMap = [];
        foreach ($opts as $o) $optMap[$o->question_id][] = ['label' => $o->option_label, 'text' => $o->option_text];
        $data = array_map(fn($q) => array_merge((array)$q, ['options' => $optMap[$q->id] ?? []]), $questions);
        $this->_json(['success' => true, 'count' => count($data), 'data' => $data]);
    }

    public function pyq2_attempt_start() {
        $user = $this->_verify_token();
        $body = $this->_body();
        $year = $body['year'] ?? null;
        if (!$year) $this->_json(['success' => false, 'error' => 'year required'], 400);
        $paper = $this->db->get_where('pyq_papers', ['year' => (int)$year])->row();
        if (!$paper) $this->_json(['success' => false, 'error' => 'No paper for that year'], 404);
        $medium = $body['medium'] ?? 'all';
        $this->db->where('paper_id', $paper->id);
        if ($medium !== 'all') $this->db->where('medium', $medium);
        $count = $this->db->count_all_results('pyq_questions');
        $this->db->insert('pyq_attempts', ['user_id' => $user['id'], 'paper_id' => $paper->id, 'medium_filter' => $medium, 'total_questions' => $count]);
        $this->_json(['success' => true, 'data' => ['attempt_id' => $this->db->insert_id(), 'total_questions' => $count, 'paper_id' => $paper->id]]);
    }

    public function pyq2_attempt_submit($attempt_id) {
        $user = $this->_verify_token();
        $body = $this->_body();
        $attempt = $this->db->get_where('pyq_attempts', ['id' => $attempt_id, 'user_id' => $user['id']])->row();
        if (!$attempt) $this->_json(['success' => false, 'error' => 'Attempt not found'], 404);
        if ($attempt->submitted_at) $this->_json(['success' => false, 'error' => 'Already submitted'], 400);
        $this->db->where('paper_id', $attempt->paper_id);
        if ($attempt->medium_filter !== 'all') $this->db->where('medium', $attempt->medium_filter);
        $questions = $this->db->select('id, correct_option')->get('pyq_questions')->result();
        $answers   = $body['answers'] ?? [];
        $correct = $wrong = $answered = 0;
        $rows = [];
        foreach ($questions as $q) {
            $sel = $answers[(string)$q->id] ?? $answers[$q->id] ?? null;
            if ($sel) {
                $answered++;
                $ok = ($sel === $q->correct_option) ? 1 : 0;
                if ($ok) $correct++; else $wrong++;
                $rows[] = [$attempt_id, $q->id, $sel, $ok];
            }
        }
        if ($rows) {
            $vals = implode(',', array_fill(0, count($rows), '(?,?,?,?)'));
            $flat = array_merge(...$rows);
            $this->db->query("INSERT INTO pyq_attempt_answers (attempt_id, question_id, selected_option, is_correct) VALUES $vals ON DUPLICATE KEY UPDATE selected_option=VALUES(selected_option), is_correct=VALUES(is_correct)", $flat);
        }
        $total = $attempt->total_questions ?: count($questions);
        $pct   = $total > 0 ? round($correct / $total * 100, 2) : 0;
        $this->db->where('id', $attempt_id)->update('pyq_attempts', ['answered_count' => $answered, 'correct_count' => $correct, 'wrong_count' => $wrong, 'score_percentage' => $pct, 'time_taken_seconds' => $body['time_taken_seconds'] ?? 0, 'submitted_at' => date('Y-m-d H:i:s')]);
        $this->_json(['success' => true, 'data' => ['attempt_id' => (int)$attempt_id, 'total' => $total, 'answered' => $answered, 'correct' => $correct, 'wrong' => $wrong, 'unanswered' => $total - $answered, 'score_percentage' => $pct]]);
    }

    public function pyq2_history() {
        $user = $this->_verify_token();
        $rows = $this->db->select('a.id, a.paper_id, a.medium_filter, a.started_at, a.submitted_at, a.total_questions, a.answered_count, a.correct_count, a.wrong_count, a.score_percentage, a.time_taken_seconds, p.year, p.exam_code, p.label')
            ->from('pyq_attempts a')->join('pyq_papers p', 'a.paper_id = p.id')
            ->where('a.user_id', $user['id'])->where('a.submitted_at IS NOT NULL')
            ->order_by('a.submitted_at', 'DESC')->limit(50)->get()->result();
        $this->_json(['success' => true, 'data' => $rows]);
    }

    public function pyq2_history_detail($attempt_id) {
        $user    = $this->_verify_token();
        $attempt = $this->db->select('a.*, p.year, p.exam_code, p.label')->from('pyq_attempts a')->join('pyq_papers p', 'a.paper_id = p.id')->where('a.id', $attempt_id)->where('a.user_id', $user['id'])->get()->row();
        if (!$attempt) $this->_json(['success' => false, 'error' => 'Not found'], 404);
        $this->db->select('q.id, q.q_no, q.question_text, q.correct_option, q.medium, q.difficulty, aa.selected_option, aa.is_correct')
            ->from('pyq_questions q')
            ->join("pyq_attempt_answers aa", "aa.question_id=q.id AND aa.attempt_id=$attempt_id", 'left')
            ->where('q.paper_id', $attempt->paper_id);
        if ($attempt->medium_filter !== 'all') $this->db->where('q.medium', $attempt->medium_filter);
        $questions = $this->db->order_by('q.q_no')->get()->result();
        $qids = array_column($questions, 'id');
        $opts = $qids ? $this->db->where_in('question_id', $qids)->order_by('option_label')->get('pyq_options')->result() : [];
        $optMap = [];
        foreach ($opts as $o) $optMap[$o->question_id][] = ['label' => $o->option_label, 'text' => $o->option_text];
        $data = array_map(fn($q) => array_merge((array)$q, ['options' => $optMap[$q->id] ?? []]), $questions);
        $this->_json(['success' => true, 'data' => ['attempt' => $attempt, 'questions' => $data]]);
    }

    // ── ANALYTICS ─────────────────────────────────────────────────────────────

    public function analysis_weak_topics() {
        $user = $this->_verify_token();
        $rows = $this->db->select('t.topic_id, t.topic_name_english, t.topic_name_tamil, s.subject_name_english, COUNT(ea.id) as attempts, AVG(ea.score) as avg_score, MIN(ea.score) as min_score, MAX(ea.score) as max_score')
            ->from('exam_attempts ea')->join('topics t', 'ea.topic_id = t.topic_id')->join('subjects s', 't.subject_id = s.subject_id')
            ->where('ea.user_id', $user['id'])
            ->group_by('t.topic_id, t.topic_name_english, t.topic_name_tamil, s.subject_name_english')
            ->having('avg_score <', 60)->order_by('avg_score')->limit(10)->get()->result();
        $wrongCount = $this->db->select('q.topic_id, COUNT(*) as wrong_count')
            ->from('wrong_answers wa')->join('questions q', 'wa.question_id = q.id')
            ->where('wa.user_id', $user['id'])->where('wa.mastered', 0)
            ->group_by('q.topic_id')->order_by('wrong_count', 'DESC')->limit(10)->get()->result();
        $wrongMap = [];
        foreach ($wrongCount as $r) $wrongMap[$r->topic_id] = $r->wrong_count;
        $weak = array_map(fn($r) => array_merge((array)$r, ['avg_score' => (int)round($r->avg_score), 'unmastered_wrong_answers' => $wrongMap[$r->topic_id] ?? 0, 'priority' => $r->avg_score < 40 ? 'critical' : 'needs_improvement']), $rows);
        $this->_json(['success' => true, 'data' => $weak]);
    }

    public function analysis_recommendations() {
        $user = $this->_verify_token();
        $wrongTopics = $this->db->select('t.topic_id, t.topic_name_english, t.topic_name_tamil, s.subject_name_english, s.subject_name_tamil, t.exam_priority, COUNT(wa.id) as wrong_count')
            ->from('wrong_answers wa')->join('questions q', 'wa.question_id = q.id')->join('topics t', 'q.topic_id = t.topic_id')->join('subjects s', 't.subject_id = s.subject_id')
            ->where('wa.user_id', $user['id'])->where('wa.mastered', 0)
            ->group_by('t.topic_id, t.topic_name_english, t.topic_name_tamil, s.subject_name_english, s.subject_name_tamil, t.exam_priority')
            ->order_by('(CASE t.exam_priority WHEN "high" THEN 3 WHEN "medium" THEN 2 ELSE 1 END)', 'DESC', false)
            ->order_by('wrong_count', 'DESC')->limit(3)->get()->result();
        $untriedTopics = $this->db->select('t.topic_id, t.topic_name_english, t.topic_name_tamil, s.subject_name_english, t.exam_priority')
            ->from('topics t')->join('subjects s', 't.subject_id = s.subject_id')
            ->where('t.exam_priority', 'high')
            ->where("t.topic_id NOT IN (SELECT DISTINCT topic_id FROM exam_attempts WHERE user_id = {$user['id']})")
            ->where("t.topic_id NOT IN (SELECT DISTINCT topic_id FROM user_topic_progress WHERE user_id = {$user['id']} AND completed = 1)")
            ->order_by('RAND()')->limit(3)->get()->result();
        $msg = $wrongTopics ? "Focus on {$wrongTopics[0]->topic_name_english} — you have {$wrongTopics[0]->wrong_count} unmastered wrong answers." : "Great job! Explore high-priority topics you haven't tried yet.";
        $this->_json(['success' => true, 'data' => ['revise_wrong_answers' => $wrongTopics, 'explore_high_priority' => $untriedTopics, 'message' => $msg]]);
    }

    public function user_analytics() {
        $user = $this->_verify_token();
        $scoreTrend = $this->db->select('DATE(created_at) as date, AVG(score) as avg_score, COUNT(*) as exams')
            ->where('user_id', $user['id'])->where('created_at >=', date('Y-m-d', strtotime('-30 days')))
            ->group_by('DATE(created_at)')->order_by('date')->get('exam_attempts')->result();
        $subjectAccuracy = $this->db->select('s.subject_id, s.subject_name_english, s.subject_name_tamil, COUNT(ea.id) as attempts, AVG(ea.score) as avg_score, AVG(ea.correct_answers / NULLIF(ea.total_questions, 0) * 100) as accuracy')
            ->from('exam_attempts ea')->join('topics t', 'ea.topic_id = t.topic_id')->join('subjects s', 't.subject_id = s.subject_id')
            ->where('ea.user_id', $user['id'])->group_by('s.subject_id, s.subject_name_english, s.subject_name_tamil')->order_by('avg_score')->get()->result();
        $difficultyBreakdown = $this->db->select('q.difficulty, COUNT(*) as count')
            ->from('wrong_answers wa')->join('questions q', 'wa.question_id = q.id')
            ->where('wa.user_id', $user['id'])->where('wa.mastered', 0)->group_by('q.difficulty')->get()->result();
        $mastery = $this->db->select('(SELECT COUNT(*) FROM user_topic_progress WHERE user_id = ? AND completed = 1) as completed, (SELECT COUNT(*) FROM topics) as total', [$user['id']], false)->get()->row();
        $heatmap = $this->db->where('user_id', $user['id'])->where('activity_date >=', date('Y-m-d', strtotime('-30 days')))->order_by('activity_date')->get('daily_activity')->result();
        $wrongStats = $this->db->select('COUNT(*) as total_wrong, SUM(mastered) as mastered, SUM(1-mastered) as unmastered, AVG(attempt_count) as avg_attempts')->where('user_id', $user['id'])->get('wrong_answers')->row();
        $this->_json(['success' => true, 'data' => [
            'score_trend'        => array_map(fn($r) => array_merge((array)$r, ['avg_score' => (int)round($r->avg_score)]), $scoreTrend),
            'subject_accuracy'   => array_map(fn($r) => array_merge((array)$r, ['avg_score' => (int)round($r->avg_score ?? 0), 'accuracy' => (int)round($r->accuracy ?? 0)]), $subjectAccuracy),
            'difficulty_breakdown' => $difficultyBreakdown,
            'topic_mastery'      => ['completed' => $mastery->completed ?? 0, 'total' => $mastery->total ?? 0],
            'activity_heatmap'   => $heatmap,
            'wrong_answers'      => $wrongStats,
        ]]);
    }
}
