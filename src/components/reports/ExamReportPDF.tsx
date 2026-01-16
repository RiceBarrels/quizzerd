import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #2563eb",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: "1px solid #e2e8f0",
  },
  row: {
    flexDirection: "row",
    marginBottom: 6,
  },
  label: {
    width: 120,
    color: "#64748b",
  },
  value: {
    flex: 1,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 20,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  statLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 4,
  },
  questionCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  questionNumber: {
    fontWeight: "bold",
    color: "#475569",
  },
  questionPoints: {
    fontSize: 10,
    color: "#64748b",
  },
  questionText: {
    marginBottom: 6,
  },
  answerRow: {
    flexDirection: "row",
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px dashed #e2e8f0",
  },
  answerLabel: {
    width: 100,
    fontSize: 10,
    color: "#64748b",
  },
  answerValue: {
    flex: 1,
    fontSize: 10,
  },
  correct: {
    color: "#16a34a",
  },
  incorrect: {
    color: "#dc2626",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 10,
  },
  badge: {
    backgroundColor: "#16a34a",
    color: "white",
    padding: "4 8",
    borderRadius: 4,
    fontSize: 10,
  },
  badgeFail: {
    backgroundColor: "#dc2626",
  },
});

export interface ReportData {
  examName: string;
  courseName?: string;
  studentName: string;
  studentEmail: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passingScore?: number;
  passed?: boolean;
  submittedAt: string;
  timeSpent?: string;
  questions?: Array<{
    number: number;
    text: string;
    points: number;
    earnedPoints: number;
    userAnswer: string;
    correctAnswer?: string;
    isCorrect: boolean;
  }>;
}

interface ExamReportPDFProps {
  data: ReportData;
  showQuestions?: boolean;
}

export function ExamReportPDF({
  data,
  showQuestions = true,
}: ExamReportPDFProps) {
  const formattedDate = new Date(data.submittedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{data.examName}</Text>
          <Text style={styles.subtitle}>Grade Report</Text>
        </View>

        {/* Student Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.studentName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{data.studentEmail}</Text>
          </View>
          {data.courseName && (
            <View style={styles.row}>
              <Text style={styles.label}>Course</Text>
              <Text style={styles.value}>{data.courseName}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Submitted</Text>
            <Text style={styles.value}>{formattedDate}</Text>
          </View>
          {data.timeSpent && (
            <View style={styles.row}>
              <Text style={styles.label}>Time Spent</Text>
              <Text style={styles.value}>{data.timeSpent}</Text>
            </View>
          )}
        </View>

        {/* Score Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Score Summary</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {data.score}/{data.totalPoints}
              </Text>
              <Text style={styles.statLabel}>Points Earned</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.percentage}%</Text>
              <Text style={styles.statLabel}>Percentage</Text>
            </View>
            <View style={styles.statBox}>
              <Text
                style={[
                  styles.statValue,
                  data.passed ? styles.correct : styles.incorrect,
                ]}
              >
                {data.passed ? "PASS" : "FAIL"}
              </Text>
              <Text style={styles.statLabel}>
                {data.passingScore ? `Required: ${data.passingScore}%` : "Result"}
              </Text>
            </View>
          </View>
        </View>

        {/* Question Details */}
        {showQuestions && data.questions && data.questions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Question Details</Text>
            {data.questions.map((q) => (
              <View key={q.number} style={styles.questionCard}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNumber}>Question {q.number}</Text>
                  <Text
                    style={[
                      styles.questionPoints,
                      q.isCorrect ? styles.correct : styles.incorrect,
                    ]}
                  >
                    {q.earnedPoints}/{q.points} points
                  </Text>
                </View>
                <Text style={styles.questionText}>{q.text}</Text>
                <View style={styles.answerRow}>
                  <Text style={styles.answerLabel}>Your Answer:</Text>
                  <Text
                    style={[
                      styles.answerValue,
                      q.isCorrect ? styles.correct : styles.incorrect,
                    ]}
                  >
                    {q.userAnswer || "(No answer)"}
                  </Text>
                </View>
                {!q.isCorrect && q.correctAnswer && (
                  <View style={styles.answerRow}>
                    <Text style={styles.answerLabel}>Correct Answer:</Text>
                    <Text style={[styles.answerValue, styles.correct]}>
                      {q.correctAnswer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Generated by QuizZerd on {new Date().toLocaleDateString()}
        </Text>
      </Page>
    </Document>
  );
}
