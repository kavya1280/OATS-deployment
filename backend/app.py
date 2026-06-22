import argparse
from flask import Flask, request, redirect, url_for, session, jsonify
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict
import smtplib
from email.message import EmailMessage
import random


from flask_cors import CORS

USERS_FILE = 'data/users.json'

def load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)
USERS = load_users()

def try_parse_date(s):
    if not s:
        return None
    s = s.split(" ")[0]
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None



app = Flask(__name__)

app.config.update(
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=False, # Set to True in production with HTTPS
    SESSION_COOKIE_HTTPONLY=True,
)
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "https://oats-deployment.onrender.com"
            ]
        }
    },
    supports_credentials=True
)
app.secret_key = 'oats-demo-key'

DATA_PATH = 'data/insights'
USERS_FILE = 'data/users.json'


AUDITEE_MAPPING = {
    'default_region_based': {
        'filter_column': 'T2_PARTNER_REGION',
        'region_to_user': {
            'NORTH 1': 'auditee1', 'NORTH 2': 'auditee1', 'NORTH': 'auditee1', 'North': 'auditee1', 'North 1': 'auditee1', 'North 2': 'auditee1',
            'WEST 1': 'auditee2', 'WEST': 'auditee2', 'West 1': 'auditee2', 'West': 'auditee2',
            'SOUTH': 'auditee3', 'South': 'auditee3', 'South 1': 'auditee3', 'South 2': 'auditee3', 'SOUTH 1': 'auditee3', 'SOUTH 2': 'auditee3',
            'EAST': 'auditee4', 'East': 'auditee4', 'EAST 1': 'auditee4', 'East 1': 'auditee4', 'EAST 2': 'auditee4', 'East 2': 'auditee4',
            'E-Commerce': 'auditee6'
        }
    }
}

AUDITOR_MAPPING = {
    'auditor1': ['auditee1', 'auditee2'],
    'auditor2': ['auditee3', 'auditee4', 'auditee6']
}

today= datetime.now()
MASTER_INSIGHTS = [

    {'id': 'AUD-001_A', 'objective': 'Multiple transaction for same serial number', 'exception': 'Multiple transaction for same serial number', 'risk': 'Critical','entity': 'Lenovo (India) Private Ltd',  'file_id': 'multiple_transaction_for_same_serial_number', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD-002_A', 'objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Invoice Sequence Mismatch', 'risk': 'Critical','entity': 'Lenovo (India) Private Ltd', 'file_id': 'invoice_sequence_mismatch_invoice_sequence_mismatch', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD-002_B', 'objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Invoice Pattern Mismatch', 'risk': 'High','entity': 'Moto Mobility IN Pvt Ltd', 'file_id': 'invoice_sequence_mismatch_invoice_pattern_mismatch', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD-002_C', 'objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Duplicate Serial Number', 'risk': 'Medium','entity': 'Moto Mobi Chennai Pvt Ltd', 'file_id': 'invoice_sequence_mismatch_duplicate_serial_no',  'due_date': (today + timedelta(days=random.randint(10, 30))).strftime('%Y-%m-%d')},
    {'id': 'AUD-002_D', 'objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Duplicate Invoices', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'invoice_sequence_mismatch_duplicate_invoice','due_date': (today + timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'),},
    {'id': 'AUD_003_A', 'objective': 'Serial Number Analysis', 'exception': 'Serial Number not in SI', 'risk': 'Medium', 'entity': 'Lenovo (India) Private Ltd', 'file_id': 'serial_number_not_in_si', 'due_date': (today + timedelta(days=random.randint(10, 30))).strftime('%Y-%m-%d'),},
    {'id': 'AUD_003_B', 'objective': 'Serial Number Analysis', 'exception': 'Serial Number not in ST', 'risk': 'Medium', 'entity': 'Moto Mobility IN Pvt Ltd','file_id': 'serial_number_not_in_st', 'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d')},
    {'id': 'AUD_004-A', 'objective': 'MS Activation', 'exception': 'MS Activation', 'risk': 'Low','entity': 'Lenovo (India) Private Ltd',  'file_id': 'ms_activation',  'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d')},
    {'id': 'AUD_005-A', 'objective': 'Dead on Arrival', 'exception': 'Dead on Arrival', 'risk': 'Critical', 'entity': 'Lenovo (India) Private Ltd', 'file_id': 'dead_on_arrival', 'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d')},
    {'id': 'AUD_006_A', 'objective': 'Return Analytics', 'exception': 'Price variance', 'risk': 'Medium', 'entity': 'Moto Mobi Chennai Pvt Ltd', 'file_id': 'retun_analytics_price_variance',  'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d')},
    {'id': 'AUD_006_B', 'objective': 'Return Analytics', 'exception': 'Immediate return', 'risk': 'Medium', 'entity': 'Lenovo (India) Private Ltd', 'file_id': 'retun_analytics_immediate_return', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d')},
    {'id': 'AUD_006_C', 'objective': 'Return Analytics', 'exception': 'Return without sale', 'risk': 'Medium', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'retun_analytics_return_without_sale', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d')},
    {'id': 'AUD_006_D', 'objective': 'Return Analytics', 'exception': 'Returned after 180 days', 'risk': 'Medium','entity': 'Moto Mobi Chennai Pvt Ltd', 'file_id': 'retun_analytics_returned_after_180_days', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d')},
    {'id': 'AUD_006_E', 'objective': 'Return Analytics', 'exception': 'Multiple Return', 'risk': 'Medium','entity': 'Lenovo GT (IN) Pte Ltd.', 'file_id': 'retun_analytics_multiple_return', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d')},
    {'id': 'AUD_007_A', 'objective': 'Credit Limit Analytics', 'exception': 'Multiple credit limits', 'risk': 'Low','entity': 'Lenovo GT (IN) Pte Ltd.', 'file_id': 'customer_having_multiple_credit_limits', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d')},
    {'id': 'AUD_007_B', 'objective': 'Credit Limit Analytics', 'exception': 'Receivables exceeding credit limits','entity': 'Lenovo GT (IN) Pte Ltd.', 'risk': 'Low', 'file_id': 'receivables_exceeding_credit_limits', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d')},
    {'id': 'AUD_008_A', 'objective': 'Customer having multiple payment terms', 'exception': 'Multiple payment terms', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'customer_having_multiple_payment_terms', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d')},
    {'id': 'AUD_009_A', 'objective': 'Duplicate Analytics', 'exception': 'Duplicate and Invalid Vendors', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'duplicate_and_invalid_vendors ', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d')},
    {'id': 'AUD_009_B', 'objective': 'Duplicate Analytics', 'exception': 'Duplicate and Invalid Customers', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'duplicate_and_invalid_customers', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d')},
    {'id': 'AUD_010_A', 'objective': 'Price Variance', 'exception': 'Price Variance', 'risk': 'Low', 'entity': 'Moto Mobility IN Pvt Ltd', 'file_id': 'price_variance', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD_011_A', 'objective': 'Split PO', 'exception': 'Split PO', 'risk': 'High','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'split_po', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD_012_A', 'objective': 'Vendor master - PO Payment terms mismatch', 'exception': 'PO Payment terms mismatch', 'risk': 'High', 'entity': 'Moto Mobility IN Pvt Ltd', 'file_id': 'vendor_master_po_payment_terms_mismatch', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD_013_A', 'objective': 'Opportunity Analytics', 'exception': 'Opportunity Analytics', 'risk': 'Medium','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'opportunity_analytics', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD_014_A', 'objective': 'Open PO and PR', 'exception': 'Open PO and PR', 'risk': 'Low','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'open_po_and_pr','due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d')},
    {'id': 'AUD_015_A', 'objective': 'Blacklisted Customers', 'exception': 'Blacklisted Customers', 'risk': 'Medium','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'blacklisted_customers', 'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d')},
]

def get_master_info(file_id):
    return next((m for m in MASTER_INSIGHTS if m['file_id'] == file_id), None)

def get_mapping_rule(insight_id):
    return AUDITEE_MAPPING.get(insight_id) or AUDITEE_MAPPING.get('default_region_based')

@app.route('/')
def home():
    return redirect('/login')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    uname, passwd = data.get('username'), data.get('password')
    if uname in USERS and USERS[uname]['password'] == passwd:
        session['user'] = uname
        session['role'] = USERS[uname]['role']
        return {"status": True, "message": "Login successful", "data": {"user": uname, "role": USERS[uname]['role']}}
    return {"status": False, "message": "Invalid credentials"}, 401

# @app.route('/login', methods=['POST'])
# def login():
#     data = request.get_json()
#     uname = data.get('username')
#     passwd = data.get('password')

#     users = load_users()

#     if uname in users and users[uname]['password'] == passwd:
#         session['user'] = uname
#         session['role'] = users[uname]['role']

#         return jsonify({
#             "status": True,
#             "message": "Login successful",
#             "data": {
#                 "user": uname,
#                 "role": users[uname]['role']
#             }
#         })

#     return jsonify({
#         "status": False,
#         "message": "Invalid credentials"
#     }), 401


@app.route('/send_email', methods=['POST'])
def send_email():
    to = request.form.get('to', '').strip()
    cc = request.form.get('cc', '').strip()
    bcc = request.form.get('bcc', '').strip()
    subject = request.form.get('subject', '').strip() or "No Subject"
    body = request.form.get('body', '').strip() or "No Body Content"
    attachment = request.files.get('attachment')

    msg = EmailMessage()
    msg['From'] = 'sanyam@ajalabs.ai'
    msg['To'] = to
    if cc:
        msg['Cc'] = cc
    if bcc:
        msg['Bcc'] = bcc
    msg['Subject'] = subject
    msg.set_content(body)

    if attachment and attachment.filename:
        filename = attachment.filename
        file_data = attachment.read()
        msg.add_attachment(file_data, maintype='application', subtype='octet-stream', filename=filename)

    try:
        with smtplib.SMTP('smtp.yandex.com', 587) as smtp:
            smtp.starttls()
            smtp.login('sanyam@ajalabs.ai', 'Password')  
            smtp.send_message(msg)

        return jsonify({'status': 'success'})
    except Exception as e:
        print("Email sending failed:", e)
        print("Form Data:", request.form)
        print("Files:", request.files)
        return jsonify({'status': 'error', 'message': str(e)})


@app.route('/aibox/<insight_id>')
def aibox(insight_id):
    user = session.get("user")
    if not user:
        return redirect('/login')

    mapping = get_mapping_rule(insight_id)
    if not mapping:
        return "Mapping rule not found for this insight.", 404

    regions_for_user = [r for r, u in mapping['region_to_user'].items() if u == user]
    
    filepath = f"data/insights/{insight_id}.json"
    if not os.path.exists(filepath):
        return "Insight data file not found.", 404

    with open(filepath, "r", encoding="utf-8") as f:
        all_data = json.load(f)

    reviewed_path = f"data/reviewed/{insight_id}_{user}.json"
    submitted_ids = set()
    if os.path.exists(reviewed_path):
        with open(reviewed_path, 'r', encoding='utf-8') as f:
            try: 
                reviewed_data = json.load(f)
                submitted_ids = {row.get('INVOICE_NO') for row in reviewed_data if row.get('Comment')}
            except json.JSONDecodeError: pass

    data_for_user = [row for row in all_data 
                     if row.get(mapping['filter_column'], "") in regions_for_user and 
                     row.get('INVOICE_NO') not in submitted_ids]

    return jsonify({
        "insight_id" : insight_id, 
        "data" : data_for_user
    } )

@app.route("/submit_aibox/<insight_id>", methods=["POST"])
def submit_aibox(insight_id):
    user = session.get('user')
    new_data = request.get_json()
    
    save_path = f"data/reviewed/{insight_id}_{user}.json"

    existing_data = []
    if os.path.exists(save_path):
        with open(save_path, 'r', encoding='utf-8') as f:
            try:
                existing_data = json.load(f)
            except json.JSONDecodeError:
                existing_data = []

    new_ids = {row['INVOICE_NO'] for row in new_data}
    final_data = [row for row in existing_data if row.get('INVOICE_NO') not in new_ids]
    final_data.extend(new_data)

    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=4)

    return jsonify({'status': 'success', 'message': f'{len(new_data)} items submitted.'})


@app.route('/dashboard')
def dashboard():
    user = session.get('user')
    if not user or USERS.get(user, {}).get('role') != 'auditee':
        return jsonify({
            "status": False,
            "message": "Unauthorized"
        }), 401

    assigned_auditor = "N/A"
    for auditor, auditees in AUDITOR_MAPPING.items():
        if user in auditees: assigned_auditor = auditor; break
    
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)


    all_items_for_auditee = []
    default_mapping_rule = get_mapping_rule(None)
    
    for master_item in MASTER_INSIGHTS:
        path = os.path.join(DATA_PATH, f"{master_item['file_id']}.json")
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            try: items = json.load(f)
            except json.JSONDecodeError: continue
        regions_for_user = [r for r, u in default_mapping_rule['region_to_user'].items() if u == user]
        for item in items:
            if item.get(default_mapping_rule['filter_column']) in regions_for_user:
                all_items_for_auditee.append({**item, 'master': master_item})

    selected_filters = {
        'insight': request.args.get('insight', 'all'), 'risk': request.args.get('risk', 'all'),
        'org': request.args.get('org', 'all'), 'status': request.args.get('status', 'all')
    }
    filtered_items = all_items_for_auditee
    if selected_filters['insight'] != 'all': filtered_items = [i for i in filtered_items if i['master']['objective'] == selected_filters['insight']]
    if selected_filters['risk'] != 'all': filtered_items = [i for i in filtered_items if i['master']['risk'] == selected_filters['risk']]
    if selected_filters['org'] != 'all': filtered_items = [i for i in filtered_items if i['master']['entity'] == selected_filters['org']]
        
    submitted_ids = set()
    for master_item in MASTER_INSIGHTS:
        reviewed_path = f"data/reviewed/{master_item['file_id']}_{user}.json"
        if os.path.exists(reviewed_path):
            with open(reviewed_path, encoding='utf-8') as rfile:
                try:
                    reviewed = json.load(rfile)
                    submitted_ids.update(row.get('INVOICE_NO') for row in reviewed if row.get('Comment'))
                except json.JSONDecodeError: pass

    table_data = []
    insight_groups = defaultdict(list)
    for item in filtered_items: insight_groups[item['master']['id']].append(item)
    
    for insight_id, items in insight_groups.items():
        master_info = items[0]['master']
        total_count = len(items)
        pending_count = len([item for item in items if item.get('INVOICE_NO') not in submitted_ids])
        if pending_count == 0: status = "Completed"
        elif pending_count < total_count: status = "In Progress"
        else: status = "Yet to Start"
        
        if selected_filters['status'] != 'all' and status != selected_filters['status']:
            continue
        
        due_date = datetime.strptime(master_info['due_date'], '%Y-%m-%d')
        is_overdue = (due_date < today) and (status != "Completed")
        table_data.append({'objective': master_info['objective'], 'exception': master_info['exception'], 'total_count': total_count, 'pending_count': pending_count, 'risk': master_info['risk'], 'due_date_str': due_date.strftime('%d-%b-%Y'), 'is_overdue': is_overdue, 'file_id': master_info['file_id'], 'entity': master_info['entity']})

    kpi_data = {
        'total_exceptions': sum(row['total_count'] for row in table_data),
        'pending_items': sum(row['pending_count'] for row in table_data),
        'total_insights': len(table_data)
    }
    
    status_counts = defaultdict(int); items_per_insight = defaultdict(int); insights_by_risk = defaultdict(int); items_per_org = defaultdict(int)
    for row in table_data:
        if row['pending_count'] > 0:
            if row['pending_count'] == row['total_count']: status_counts['Yet to Start'] += row['pending_count']
            else: status_counts['In Progress'] += row['pending_count']
        if row['pending_count'] < row['total_count']:
            status_counts['Completed'] += (row['total_count'] - row['pending_count'])
        
        # items_per_insight[row['objective']] += row['pending_count']
        items_per_insight[row['objective']] += row['total_count'] 
        insights_by_risk[row['risk']] += 1
        items_per_org[row['entity']] += row['pending_count']

    chart_data = {
        'items_per_insight': {'labels': list(items_per_insight.keys()), 'data': list(items_per_insight.values())},
        'status_breakdown': {'labels': list(status_counts.keys()), 'data': list(status_counts.values())},
        'insights_by_risk': {'labels': list(insights_by_risk.keys()), 'data': list(insights_by_risk.values())},
        'items_per_org': {'labels': list(items_per_org.keys()), 'data': list(items_per_org.values())}
    }
    
    auditee_data = {
    "labels": ["Auditee1", "Auditee2"],
    "auditee1": [120, 0],
    "auditee2": [0, 85]
    }

    filter_options = {
        'insights': sorted(list(set(m['objective'] for m in MASTER_INSIGHTS))),
        'risks': ['Critical', 'High', 'Medium', 'Low'],
        'organizations': sorted(list(set(m['entity'] for m in MASTER_INSIGHTS))),
        'statuses': ['Yet to Start', 'In Progress', 'Completed']
    }
    
    last_refresh_time = datetime.now() - timedelta(hours=20, minutes=14);
    last_refresh_str = f"{last_refresh_time.strftime('%d-%b-%Y %H:%M')} ({((datetime.now() - last_refresh_time).total_seconds() / 3600):.0f}h ago)"

    return {
        "user" : user, 
        "assigned_auditor" : assigned_auditor, 
        "kpi_data" : kpi_data, 
        "chart_data" : chart_data, 
        "table_data" : table_data, 
        "filter_options" : filter_options, 
        "selected_filters" : selected_filters, 
        "last_refresh" : last_refresh_str
    } 

@app.route('/action/<insight_id>')
def action(insight_id):
    return jsonify({"insight_id" : insight_id})

@app.route('/get_action_data/<insight_id>')
def get_action_data(insight_id):
    user = session.get('user')
    mapping = get_mapping_rule(insight_id) 
    if not mapping: return jsonify({'columns': [], 'data': []})

    filter_col = mapping.get('filter_column')
    regions = [k for k, v in mapping.get('region_to_user', {}).items() if v == user]
    data = []
    
    reviewed_path = f'data/reviewed/{insight_id}_{user}.json'
    submitted_ids = set()
    if os.path.exists(reviewed_path):
        with open(reviewed_path, 'r', encoding='utf-8') as f:
            try:
                submitted_data = json.load(f)
                submitted_ids = set(row.get('INVOICE_NO') for row in submitted_data if row.get('Comment'))
            except json.JSONDecodeError: pass

    with open(f'data/insights/{insight_id}.json', 'r', encoding='utf-8') as f:
        full_data = json.load(f)
        for row in full_data:
            if row.get(filter_col) in regions and row.get('INVOICE_NO') not in submitted_ids:
                row['Comment'] = ''; row['Is Exception'] = ''; data.append(row)
    
    ordered_columns = list(data[0].keys()) if data else []
    return jsonify({'columns': ordered_columns, 'data': data})

@app.route('/submit_action_data/<insight_id>', methods=['POST'])
def submit_action_data(insight_id):
    user = session.get('user')
    new_data = request.get_json()
    save_path = f'data/reviewed/{insight_id}_{user}.json'

    new_data = [row for row in new_data if row.get('INVOICE_NO')]

    if not new_data:
        return jsonify({'status': 'error', 'message': 'No valid INVOICE_NO in submitted rows'}), 400

    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    for row in new_data:
        row['Submitted By'] = user
        row['Submitted At'] = timestamp

    reviewed_data = []
    if os.path.exists(save_path):
        with open(save_path, 'r', encoding='utf-8') as f:
            try:
                reviewed_data = json.load(f)
            except json.JSONDecodeError:
                reviewed_data = []

    new_ids = set(row['INVOICE_NO'] for row in new_data)
    reviewed_data = [row for row in reviewed_data if row.get('INVOICE_NO') not in new_ids]
    reviewed_data.extend(new_data)

    with open(save_path, 'w', encoding='utf-8') as f:
        json.dump(reviewed_data, f, indent=4)
    
    return jsonify({'status': 'success'})


@app.route('/get_history_data/<insight_id>')
def get_history_data(insight_id):

    user = session.get('user')
    reviewed_path = f'data/reviewed/{insight_id}_{user}.json'
    if os.path.exists(reviewed_path):
        with open(reviewed_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            commented_rows = [row for row in data if row.get('Comment')]
            return jsonify(commented_rows)
    return jsonify([])


@app.route('/logout')
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out"}), 200


@app.route('/auditor_dashboard')
def auditor_dashboard():
    # 1. Authorization Check
    user = session.get('user')
    if not user or USERS.get(user, {}).get('role') != 'auditor':
        return jsonify({"status": False, "message": "Unauthorized"}), 401

    assigned_auditees = AUDITOR_MAPPING.get(user, [])
    master_lookup = {m['file_id']: m for m in MASTER_INSIGHTS}
    insight_ids = [f.replace('.json', '') for f in os.listdir(DATA_PATH) if f.endswith('.json')]
    
    # 2. KPI & Chart Aggregators
    kpis = {
        'total_insights': len(insight_ids), 
        'auditee_count': len(assigned_auditees), 
        'total_items': 0, 
        'pending_auditee': 0, 
        'pending_auditor': 0
    }
    
    # Dictionary aggregators for Charts
    cat_counts = defaultdict(int)
    status_counts = defaultdict(int)
    risk_counts = defaultdict(int)
    owner_counts = defaultdict(int) # Owner = Auditee name
    
    status_table = []
    today = datetime.today()

    # 3. Data Processing
    for fid in insight_ids:
        mapping = get_mapping_rule(fid)
        if not mapping: continue

        filter_col = mapping['filter_column']
        auditee_rows = defaultdict(list)
        
        source_path = os.path.join(DATA_PATH, f'{fid}.json')
        if not os.path.exists(source_path): continue
        
        with open(source_path, encoding='utf-8') as f:
            try:
                full_data = json.load(f)
            except json.JSONDecodeError: continue

        # Group data by auditee based on region mapping
        for row in full_data:
            region = row.get(filter_col)
            auditee = mapping['region_to_user'].get(region)
            if auditee in assigned_auditees:
                auditee_rows[auditee].append(row)

        for auditee, rows in auditee_rows.items():
            kpis['total_items'] += len(rows)
            submitted_count = 0
            auditor_pending_count = 0
            
            # Check auditee's reviewed file
            reviewed_path = f'data/reviewed/{fid}_{auditee}.json'
            if os.path.exists(reviewed_path):
                with open(reviewed_path, encoding='utf-8') as rf:
                    try:
                        reviewed_data = json.load(rf)
                        # Submitted = Auditee has commented
                        submitted_ids = {r.get('INVOICE_NO') for r in reviewed_data if r.get("Comment")}
                        submitted_count = len(submitted_ids)
                        # Pending Auditor = Auditee commented but Auditor hasn't replied yet
                        auditor_pending_count = sum(1 for r in reviewed_data if r.get("Comment") and not r.get("Auditor Comment"))
                    except json.JSONDecodeError: pass
            
            pending_auditee_count = len(rows) - submitted_count
            kpis['pending_auditor'] += auditor_pending_count
            kpis['pending_auditee'] += pending_auditee_count
            
            # Logic for Status
            if pending_auditee_count == 0 and auditor_pending_count == 0:
                status, s_class = "Completed", "completed"
            elif submitted_count > 0:
                status, s_class = "In Progress", "in-progress"
            else:
                status, s_class = "Yet to Start", "yet-to-start"
            
            # Update Chart Aggregators
            status_counts[status] += 1
            owner_counts[auditee] += pending_auditee_count
            
            # (Note: For Risk and Category, you would usually map 'fid' to a Master list)
            # Dummy logic for example:
            risk_counts["High" if "AUD-001" in fid else "Medium"] += 1
            cat_counts["Supplier" if "AUD" in fid else "IT"] += 1

            status_table.append({
                "insight": fid, 
                "auditee": auditee, 
                "submitted": submitted_count, 
                "pending": pending_auditee_count, 
                "timeline": (today + timedelta(days=5)).strftime("%d-%b-%Y"), 
                "current_status": status, 
                "status_class": s_class
            })

    # 4. Format Chart Data for React (labels and values)
    chart_data = {
        "categories": {"labels": list(cat_counts.keys()), "values": list(cat_counts.values())},
        "status": {"labels": list(status_counts.keys()), "values": list(status_counts.values())},
        "risk": {"labels": list(risk_counts.keys()), "values": list(risk_counts.values())},
        "owner": {"labels": list(owner_counts.keys()), "values": list(owner_counts.values())}
    }

    # 5. Return JSON
    return jsonify({
        "kpis": kpis,
        "insights": insight_ids,
        "status_table": status_table,
        "chart_data": chart_data,
        "auditee_data": auditee_data
    })
@app.route('/auditor_action/<insight_id>')
def auditor_action(insight_id):
    return jsonify({"insight_id": insight_id})

@app.route('/get_auditor_action_data/<insight_id>')
def get_auditor_action_data(insight_id):
    user = session.get('user')
    assigned_auditees = AUDITOR_MAPPING.get(user, [])
    full_data = []
    for auditee in assigned_auditees:
        reviewed_path = f'data/reviewed/{insight_id}_{auditee}.json'
        if os.path.exists(reviewed_path):
            with open(reviewed_path, encoding='utf-8') as f:
                try: data = json.load(f)
                except json.JSONDecodeError: continue
                full_data.extend([row for row in data if row.get("Comment")])

    ordered_columns = list(full_data[0].keys()) if full_data else []
    return jsonify({'columns': ordered_columns, 'data': full_data})


@app.route('/get_auditor_pending_data/<insight_id>')
def get_auditor_pending_data(insight_id):
    user = session.get('user')
    assigned_auditees = AUDITOR_MAPPING.get(user, [])
    pending_data = []
    
    mapping = get_mapping_rule(insight_id) 
    if not mapping: return jsonify({'columns': [], 'data': []})

    all_submitted_ids = set()
    for auditee in assigned_auditees:
        reviewed_path = f'data/reviewed/{insight_id}_{auditee}.json'
        if os.path.exists(reviewed_path):
            with open(reviewed_path, encoding='utf-8') as f:
                try: 
                    reviewed_data = json.load(f)
                    all_submitted_ids.update(r.get('INVOICE_NO') for r in reviewed_data if r.get('Comment'))
                except json.JSONDecodeError: continue
    
    source_path = os.path.join(DATA_PATH, f'{insight_id}.json')
    if os.path.exists(source_path):
        with open(source_path, encoding='utf-8') as f:
            source_data = json.load(f)
        for row in source_data:
            auditee = mapping['region_to_user'].get(row.get(mapping['filter_column']))
            if auditee in assigned_auditees and row.get('INVOICE_NO') not in all_submitted_ids:
                row_copy = row.copy(); row_copy['Assigned Auditee'] = auditee; pending_data.append(row_copy)
    
    ordered_columns = list(pending_data[0].keys()) if pending_data else []
    return jsonify({'columns': ordered_columns, 'data': pending_data})


@app.route('/report')
def report():
    user = session.get('user')
    # If not logged in or not an auditor, return JSON error, NOT a redirect
    if not user or USERS.get(user, {}).get('role') != 'auditor':
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
        
    assigned_auditees = AUDITOR_MAPPING.get(user, [])
    
    today = datetime.now()

    MASTER_INSIGHTS = [
        {'id': 'AUD-001_A',  'category': 'Supplier', 'objective': 'Multiple transaction for same serial number', 'exception': 'Multiple transaction for same serial number', 'risk': 'Critical','entity': 'Lenovo (India) Private Ltd',  'file_id': 'multiple_transaction_for_same_serial_number', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD-002_A',  'category': 'Supplier','objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Invoice Sequence Mismatch', 'risk': 'Critical','entity': 'Lenovo (India) Private Ltd', 'file_id': 'invoice_sequence_mismatch_invoice_sequence_mismatch', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD-002_B',  'category': 'Customer','objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Invoice Pattern Mismatch', 'risk': 'High','entity': 'Moto Mobility IN Pvt Ltd', 'file_id': 'invoice_sequence_mismatch_invoice_pattern_mismatch', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD-002_C',  'category': 'Manufacturing', 'objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Duplicate Serial Number', 'risk': 'Medium','entity': 'Moto Mobi Chennai Pvt Ltd', 'file_id': 'invoice_sequence_mismatch_duplicate_serial_no',  'due_date': (today + timedelta(days=random.randint(10, 30))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD-002_D',  'category': 'Fixed Asset', 'objective': 'Invalid Sellout Transaction Analysis', 'exception': 'Duplicate Invoices', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'invoice_sequence_mismatch_duplicate_invoice','due_date': (today + timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'),  'rule': 'region_based'},
        {'id': 'AUD_003_A',  'category': 'IT', 'objective': 'Serial Number Analysis', 'exception': 'Serial Number not in SI', 'risk': 'Medium', 'entity': 'Lenovo (India) Private Ltd', 'file_id': 'serial_number_not_in_si', 'due_date': (today + timedelta(days=random.randint(10, 30))).strftime('%Y-%m-%d'),  'rule': 'region_based'},
        {'id': 'AUD_003_B',  'category': 'HR',  'objective': 'Serial Number Analysis', 'exception': 'Serial Number not in ST', 'risk': 'Medium', 'entity': 'Moto Mobility IN Pvt Ltd','file_id': 'serial_number_not_in_st', 'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_004-A',  'category': 'Supplier','objective': 'MS Activation', 'exception': 'MS Activation', 'risk': 'Low','entity': 'Lenovo (India) Private Ltd',  'file_id': 'ms_activation',  'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_005-A',  'category': 'Supplier','objective': 'Dead on Arrival', 'exception': 'Dead on Arrival', 'risk': 'Critical', 'entity': 'Lenovo (India) Private Ltd', 'file_id': 'dead_on_arrival', 'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_006_A',  'category': 'Supplier','objective': 'Return Analytics', 'exception': 'Price variance', 'risk': 'Medium', 'entity': 'Moto Mobi Chennai Pvt Ltd', 'file_id': 'retun_analytics_price_variance',  'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_006_B',  'category': 'Customer','objective': 'Return Analytics', 'exception': 'Immediate return', 'risk': 'Medium', 'entity': 'Lenovo (India) Private Ltd', 'file_id': 'retun_analytics_immediate_return', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_006_C', 'category': 'Customer','objective': 'Return Analytics', 'exception': 'Return without sale', 'risk': 'Medium', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'retun_analytics_return_without_sale', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d'),'rule': 'region_based'},
        {'id': 'AUD_006_D', 'category': 'Customer','objective': 'Return Analytics', 'exception': 'Returned after 180 days', 'risk': 'Medium','entity': 'Moto Mobi Chennai Pvt Ltd', 'file_id': 'retun_analytics_returned_after_180_days', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_006_E', 'category': 'Customer','objective': 'Return Analytics', 'exception': 'Multiple Return', 'risk': 'Medium','entity': 'Lenovo GT (IN) Pte Ltd.', 'file_id': 'retun_analytics_multiple_return', 'due_date': (today - timedelta(days=random.randint(95, 120))).strftime('%Y-%m-%d'),'rule': 'region_based'},
        {'id': 'AUD_007_A', 'category': 'Customer','objective': 'Credit Limit Analytics', 'exception': 'Multiple credit limits', 'risk': 'Low','entity': 'Lenovo GT (IN) Pte Ltd.', 'file_id': 'customer_having_multiple_credit_limits', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_007_B','category': 'IT', 'objective': 'Credit Limit Analytics', 'exception': 'Receivables exceeding credit limits','entity': 'Lenovo GT (IN) Pte Ltd.', 'risk': 'Low', 'file_id': 'receivables_exceeding_credit_limits', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_008_A', 'category': 'IT','objective': 'Customer having multiple payment terms', 'exception': 'Multiple payment terms', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'customer_having_multiple_payment_terms', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_009_A', 'category': 'IT','objective': 'Duplicate Analytics', 'exception': 'Duplicate and Invalid Vendors', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'duplicate_and_invalid_vendors ', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_009_B', 'category': 'IT','objective': 'Duplicate Analytics', 'exception': 'Duplicate and Invalid Customers', 'risk': 'Low', 'entity': 'Lenovo GT (IN) Pte Ltd.','file_id': 'duplicate_and_invalid_customers', 'due_date': (today - timedelta(days=random.randint(65, 80))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_010_A','category': 'IT', 'objective': 'Price Variance', 'exception': 'Price Variance', 'risk': 'Low', 'entity': 'Moto Mobility IN Pvt Ltd', 'file_id': 'price_variance', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_011_A', 'category': 'Fixed Asset','objective': 'Split PO', 'exception': 'Split PO', 'risk': 'High','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'split_po', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'),'rule': 'region_based'},
        {'id': 'AUD_012_A','category': 'Fixed Asset', 'objective': 'Vendor master - PO Payment terms mismatch', 'exception': 'PO Payment terms mismatch', 'risk': 'High', 'entity': 'Moto Mobility IN Pvt Ltd', 'file_id': 'vendor_master_po_payment_terms_mismatch', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'),'rule': 'region_based'},
        {'id': 'AUD_013_A', 'category': 'Fixed Asset','objective': 'Opportunity Analytics', 'exception': 'Opportunity Analytics', 'risk': 'Medium','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'opportunity_analytics', 'due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_014_A', 'category': 'HR','objective': 'Open PO and PR', 'exception': 'Open PO and PR', 'risk': 'Low','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'open_po_and_pr','due_date': (today - timedelta(days=random.randint(5, 20))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
        {'id': 'AUD_015_A','category': 'HR', 'objective': 'Blacklisted Customers', 'exception': 'Blacklisted Customers', 'risk': 'Medium','entity': 'Moto Mobility IN Pvt Ltd',  'file_id': 'blacklisted_customers', 'due_date': (today - timedelta(days=random.randint(35, 50))).strftime('%Y-%m-%d'), 'rule': 'region_based'},
    ]

   
    reviewed_data_cache = {}
    all_insight_files = {f.replace('.json', '') for f in os.listdir(DATA_PATH)}
    for insight_id in all_insight_files:
        for auditee in assigned_auditees:
            path = f'data/reviewed/{insight_id}_{auditee}.json'
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    try: reviewed_data_cache[(insight_id, auditee)] = {row['INVOICE_NO']: row for row in json.load(f) if 'INVOICE_NO' in row}
                    except (json.JSONDecodeError, KeyError): reviewed_data_cache[(insight_id, auditee)] = {}

    all_items_master_list = []
    default_mapping_rule = get_mapping_rule(None)

    

    for master_item in MASTER_INSIGHTS:
        path = os.path.join(DATA_PATH, f"{master_item['file_id']}.json")  
        if not os.path.exists(path): continue
        with open(path, 'r', encoding='utf-8') as f:
            try: items = json.load(f)
            except json.JSONDecodeError: continue
        
        for item in items:
            region = item.get(default_mapping_rule['filter_column'])
            auditee = default_mapping_rule['region_to_user'].get(region)
            if auditee in assigned_auditees:
                invoice_date_obj = None
                if item.get("INVOICE_DATE"):
                    try: 
                        dt = datetime.strptime(item.get("INVOICE_DATE").split(" ")[0], '%Y-%m-%d')
                        invoice_date_obj = dt
                    except ValueError: pass
                all_items_master_list.append({**item, 'master': master_item, 'auditee': auditee, 'invoice_date_obj': invoice_date_obj})

    selected_filters = { 
        'org': request.args.get('org', 'all'), 
        'location': request.args.get('location', 'all'), 
        'risk': request.args.get('risk', 'all'),
        'status': request.args.get('status', 'all'),
        'auditee': request.args.get('auditee', 'all'), 
        'insight': request.args.get('insight', 'all'), 
        'from_date': request.args.get('from_date', ''), 
        'to_date': request.args.get('to_date', '') 
    }

    filtered_items = all_items_master_list
    if selected_filters['org'] != 'all': filtered_items = [i for i in filtered_items if i['master']['entity'] == selected_filters['org']]
    if selected_filters['location'] != 'all': filtered_items = [i for i in filtered_items if i.get(default_mapping_rule['filter_column']) == selected_filters['location']]
    if selected_filters['risk'] != 'all': filtered_items = [i for i in filtered_items if i['master']['risk'] == selected_filters['risk']]
    if selected_filters['auditee'] != 'all': filtered_items = [i for i in filtered_items if i['auditee'] == selected_filters['auditee']]
    if selected_filters['insight'] != 'all': filtered_items = [i for i in filtered_items if i['master']['objective'] == selected_filters['insight']]
    if selected_filters['from_date']: from_date = datetime.strptime(selected_filters['from_date'], '%Y-%m-%d'); filtered_items = [i for i in filtered_items if i.get('invoice_date_obj') and i['invoice_date_obj'] >= from_date]
    if selected_filters['to_date']: to_date = datetime.strptime(selected_filters['to_date'], '%Y-%m-%d'); filtered_items = [i for i in filtered_items if i.get('invoice_date_obj') and i['invoice_date_obj'] <= to_date]

    table_data_map = defaultdict(lambda: {'pending': 0, 'completed': 0, 'pending_auditor': 0, 'total': 0})

    verdict_counts = defaultdict(int)
    category_counts = defaultdict(int)
    risk_trend_counts = defaultdict(lambda: defaultdict(int)) 
    map_region_counts = defaultdict(int)

    for item in filtered_items:
        key = (item['master']['id'], item['auditee'])
        table_data_map[key]['total'] += 1
        reviewed_item = reviewed_data_cache.get((item['master']['file_id'], item['auditee']), {}).get(item.get('INVOICE_NO'), {})
        
        is_pending = True
        if reviewed_item.get('Auditor Comment'):
            table_data_map[key]['completed'] += 1
            verdict = reviewed_item.get('Auditor Exception', 'N/A')
            if verdict in ['True Positive', 'False Positive']:
                verdict_counts[verdict] += 1
            is_pending = False
        elif reviewed_item.get('Comment'):
            table_data_map[key]['pending'] += 1
            table_data_map[key]['pending_auditor'] += 1
        else:
            table_data_map[key]['pending'] += 1

        if is_pending:
            category_counts[item['master'].get('category', 'Other')] += 1
            region_key = default_mapping_rule['filter_column']
            map_region_counts[item.get(region_key, 'Unknown')] += 1
            if item.get('invoice_date_obj') and item['invoice_date_obj'].year == today.year:
                month = item['invoice_date_obj'].month
                risk = item['master']['risk']
                if risk in ['Critical', 'High', 'Medium']:
                    risk_trend_counts[month][risk] += 1


    table_data = []
    unique_insights_in_view = set()
    for master_item in MASTER_INSIGHTS:
        for auditee in assigned_auditees:
            key = (master_item['id'], auditee)
            if key in table_data_map:
                counts = table_data_map[key]
                
                if counts['pending'] == 0:
                    status = "Completed"
                elif counts['pending'] < counts['total']:
                    status = "In Progress"
                else:
                    status = "Yet to Start"
                
                if selected_filters['status'] != 'all' and status != selected_filters['status']:
                    continue

                unique_insights_in_view.add(master_item['id'])
                due_date = datetime.strptime(master_item['due_date'], '%Y-%m-%d')
                overdue = (today - due_date).days if today > due_date and status != "Completed" else 0
                table_data.append({
                    **master_item, 
                    'auditee': auditee, 
                    'status': status, 
                    'pending_count': counts['pending'], 
                    'completed_count': counts['completed'], 
                    'due_date_str': master_item['due_date'], 
                    'overdue_days': overdue
                })

    kpi_data = {
        'auditees': len(assigned_auditees), 
        'exceptions': len(unique_insights_in_view or []), 
        'closed': sum(c['completed'] for c in table_data_map.values()), 
        'open': sum(c['pending'] for c in table_data_map.values() if c['pending_auditor']==0), 
        'pending_auditor': sum(c['pending_auditor'] for c in table_data_map.values()), 
        'high_risk': sum(1 for r in table_data if r['risk'] == 'High' and r['pending_count'] > 0),
        'critical_risk': sum(1 for r in table_data if r['risk'] == 'Critical' and r['pending_count'] > 0)
    }

    all_locations = sorted(list(set(i.get(default_mapping_rule['filter_column']) for i in all_items_master_list if i.get(default_mapping_rule['filter_column']))))
    all_organizations = sorted(list(set(m['entity'] for m in MASTER_INSIGHTS)))
    all_risks = sorted(list(set(m['risk'] for m in MASTER_INSIGHTS)), key=lambda x: ['Critical', 'High', 'Medium', 'Low'].index(x))
    all_statuses_for_filter = ['Yet to Start', 'In Progress', 'Completed']

    filter_options = {
        'locations': all_locations,
        'organizations': all_organizations,
        'risks': all_risks,
        'statuses': all_statuses_for_filter,
        'auditees': sorted(assigned_auditees), 
        'insights': sorted(list(set(m['objective'] for m in MASTER_INSIGHTS)))
    }

    pending_by_auditee_agg, status_counts_agg = defaultdict(int), defaultdict(int)
    for row in table_data:
        if row['pending_count'] > 0: pending_by_auditee_agg[row['auditee']] += row['pending_count']; status_counts_agg[row['status']] += row['pending_count']
    auditee_chart_data = {"labels": list(pending_by_auditee_agg.keys()), "data": list(pending_by_auditee_agg.values())}
    status_chart_data = {"labels": list(status_counts_agg.keys()), "data": list(status_counts_agg.values())}
    aging_buckets = {'< 30 Days': 0, '30-60 Days': 0, '61-90 Days': 0, '> 90 Days': 0}
    for row in table_data:
        if row['overdue_days'] > 90: aging_buckets['> 90 Days'] += row['pending_count']
        elif row['overdue_days'] > 60: aging_buckets['61-90 Days'] += row['pending_count']
        elif row['overdue_days'] > 30: aging_buckets['30-60 Days'] += row['pending_count']
        elif row['overdue_days'] > 0: aging_buckets['< 30 Days'] += row['pending_count']
    aging_chart_data = {'labels': list(aging_buckets.keys()), 'data': list(aging_buckets.values())}
    entity_status_data, all_statuses_for_chart = defaultdict(lambda: defaultdict(int)), {'Yet to Start', 'In Progress', 'Completed'}
    for row in table_data:
        if row['pending_count'] > 0: entity_status_data[row['entity']][row['status']] += row['pending_count']
    entities = sorted(entity_status_data.keys()); entity_chart_datasets = []
    for status in sorted(list(all_statuses_for_chart)):
        dataset = {'label': status, 'data': [entity_status_data[entity].get(status, 0) for entity in entities]}; dataset['backgroundColor'] = '#2ecc71' if status == 'Completed' else '#3498db' if status == 'In Progress' else '#f1c40f'; entity_chart_datasets.append(dataset)
    entity_chart_data = {'labels': entities, 'datasets': entity_chart_datasets}
    risk_data = defaultdict(int)
    for row in table_data:
        if row['pending_count'] > 0: risk_data[row['risk']] += row['pending_count']
    risk_chart_data = {'labels': list(risk_data.keys()), 'data': list(risk_data.values())}
    insight_agg = defaultdict(int)
    for row in table_data:
        if row['pending_count'] > 0: insight_agg[row['objective']] += row['pending_count']
    top_insights = sorted(insight_agg.items(), key=lambda x: x[1], reverse=True)[:5]
    top_insights_chart_data = {'labels': [item[0] for item in top_insights], 'data': [item[1] for item in top_insights]}

    verdict_data = {'labels': list(verdict_counts.keys()), 'data': list(verdict_counts.values())}
    category_data = {'labels': list(category_counts.keys()), 'data': list(category_counts.values())}
    map_data = [{'region': k, 'value': v} for k, v in map_region_counts.items()]
    
    trend_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    risk_trend_data = {
        'labels': trend_labels,
        'datasets': [
            {'label': 'Critical', 'data': [risk_trend_counts[i+1].get('Critical', 0) for i in range(12)], 'borderColor': '#e74c3c'},
            {'label': 'High', 'data': [risk_trend_counts[i+1].get('High', 0) for i in range(12)], 'borderColor': '#f39c12'},
            {'label': 'Medium', 'data': [risk_trend_counts[i+1].get('Medium', 0) for i in range(12)], 'borderColor': '#3498db'}
        ]
    }

    return jsonify({
         "kpi_data": {
        "auditees": 120,
        "exceptions": 450,
        "closed": 300,
        "open": 85,
        "pending_auditor": 65,
        "critical_risk": 12,
        "high_risk": 40
    },
        "table_data" :table_data, 
        "kpi_data" :kpi_data, 
        "auditee_data" :auditee_chart_data, 
        "status_data" :status_chart_data, 
        "filter_options" :filter_options, 
        "selected_filters" :selected_filters, 
        "entity_chart_data" :entity_chart_data, 
        "risk_chart_data" :risk_chart_data, 
        "top_insights_chart_data" :top_insights_chart_data, 
        "aging_chart_data" :aging_chart_data,
        "verdict_data" :verdict_data, 
        "category_data" :category_data, 
        "map_data" :map_data, 
        "risk_trend_data" :risk_trend_data})

@app.route('/submit_auditor_data/<insight_id>', methods=['POST'])
def submit_auditor_data(insight_id):
    user = session.get('user')
    updated_rows = request.get_json()

    for row_data in updated_rows:
        auditee_user = row_data.get('Submitted By')
        invoice_no_to_update = row_data.get('INVOICE_NO')

        if not auditee_user or not invoice_no_to_update:
            continue 

        reviewed_path = f'data/reviewed/{insight_id}_{auditee_user}.json'
        if os.path.exists(reviewed_path):
            try:
                with open(reviewed_path, 'r+', encoding='utf-8') as f:
                    existing_data = json.load(f)
                    
                    found = False
                    for i, item in enumerate(existing_data):
                        if item.get("INVOICE_NO") == invoice_no_to_update:
                            existing_data[i]['Auditor Comment'] = row_data.get('Auditor Comment')
                            
                            existing_data[i]['Auditor Exception'] = row_data.get('Auditor Exception')
                            existing_data[i]['Auditor Timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            found = True
                            break
                    
                    if found:
                        f.seek(0)
                        json.dump(existing_data, f, indent=4)
                        f.truncate()

            except (json.JSONDecodeError, IOError) as e:
                print(f"Error processing file {reviewed_path}: {e}")
                continue 

    return jsonify({'status': 'success'})


@app.route('/get_auditor_history/<insight_id>')
def get_auditor_history(insight_id):
    user = session.get('user')
    assigned_auditees = AUDITOR_MAPPING.get(user, [])
    result = []
    for auditee in assigned_auditees:
        reviewed_path = f'data/reviewed/{insight_id}_{auditee}.json'
        if os.path.exists(reviewed_path):
            with open(reviewed_path, encoding='utf-8') as f:
                try: data = json.load(f)
                except json.JSONDecodeError: continue
                result.extend([row for row in data if row.get('Auditor Comment')])
    ordered_columns = list(result[0].keys()) if result else []
    return jsonify({'columns': ordered_columns, 'data': result})



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Choose port number, default is 8080"
    )
    args = parser.parse_args()
    
    app.run(host="127.0.0.1", port=args.port, debug=True)

