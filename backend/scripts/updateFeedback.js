const fs = require('fs');
const path = 'frontend/src/components/events/FeedbackSection.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useAuthStore import
content = content.replace(
  'import dayjs from "dayjs";',
  'import dayjs from "dayjs";\nimport useAuthStore from "../../store/authStore";'
);

// 2. Add useAuthStore hook
content = content.replace(
  'const navigate = useNavigate();',
  'const navigate = useNavigate();\n  const { user } = useAuthStore();'
);

// 3. Add editData state
content = content.replace(
  'const [modalOpen, setModalOpen] = useState(false);',
  'const [modalOpen, setModalOpen] = useState(false);\n  const [editData, setEditData] = useState(null);'
);

// 4. Update the empty feedback button
content = content.replace(
  'onClick={() => setModalOpen(true)}',
  'onClick={() => { setEditData(null); setModalOpen(true); }}'
);

// 5. Update the "Viết đánh giá" button
content = content.replace(
  'onClick={() => setModalOpen(true)}',
  'onClick={() => { setEditData(null); setModalOpen(true); }}'
);

// 6. Update the FeedbackModal props
content = content.replace(
  'open={modalOpen}\n          onClose={() => setModalOpen(false)}',
  'open={modalOpen}\n          onClose={() => { setModalOpen(false); setEditData(null); }}\n          initialData={editData}'
);

// 7. Add Edit button to individual reviews
const targetString = `                  <Rate
                    disabled
                    value={item.Rating}
                    style={{fontSize: 14, color: "#facc15"}}
                  />
                </div>`;
const replaceString = `                  <div style={{display: "flex", alignItems: "center", gap: 8}}>
                    {user?.UserID === item.ParticipantID && (
                      <Button
                        type="text"
                        size="small"
                        style={{color: "#2563eb", fontSize: 13, fontWeight: 500}}
                        onClick={() => {
                          setEditData(item);
                          setModalOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                    )}
                    <Rate
                      disabled
                      value={item.Rating}
                      style={{fontSize: 14, color: "#facc15"}}
                    />
                  </div>
                </div>`;
content = content.replace(targetString, replaceString);

fs.writeFileSync(path, content);
console.log('Update successful');
