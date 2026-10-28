import assert from "node:assert";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api/v1";

async function request(endpoint, { method = "GET", data, token } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
    });

    let body = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }
    return { status: res.status, body };
}

let passedCount = 0;
let failedCount = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`✓ PASS: ${name}`);
        passedCount++;
    } catch (err) {
        console.error(`✗ FAIL: ${name}`);
        console.error(err);
        failedCount++;
        process.exitCode = 1;
    }
}

async function runSuite() {
    console.log("=== ReadyUp Final Deployment Polish Verification Suite ===\n");

    let coordinatorToken = null;
    let studentToken = null;
    let studentId = null;
    let studentDept = "Computer Science & Engineering";
    let otherStudentToken = null;
    let otherStudentId = null;

    const cleanupTestIds = [];

    await test("1. Authenticate coordinator and student accounts", async () => {
        const coordRes = await request("/auth/login", {
            method: "POST",
            data: { email: "coordinator@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(coordRes.status, 200, "Coordinator login must succeed");
        coordinatorToken = coordRes.body.data.token;

        const studentRes = await request("/auth/login", {
            method: "POST",
            data: { email: "student@readyup.edu", password: "Password123!" },
        });
        assert.strictEqual(studentRes.status, 200, "Student login must succeed");
        studentToken = studentRes.body.data.token;
        studentId = studentRes.body.data.user._id;
        studentDept = studentRes.body.data.user.department || "Computer Science & Engineering";

        const otherEmail = `mech.student.${Date.now()}@readyup.edu`;
        const otherRes = await request("/auth/register", {
            method: "POST",
            data: {
                name: "Mechanical Student",
                email: otherEmail,
                password: "Password123!",
                department: "Civil Engineering",
                graduationYear: 2026,
            },
        });
        assert.strictEqual(otherRes.status, 201, "Second student registration must succeed");
        otherStudentId = otherRes.body.data.user._id;

        const otherLoginRes = await request("/auth/login", {
            method: "POST",
            data: { email: otherEmail, password: "Password123!" },
        });
        assert.strictEqual(otherLoginRes.status, 200, "Second student login must succeed");
        otherStudentToken = otherLoginRes.body.data.token;
    });

    let draftId = null;
    await test("2. Coordinator saves a draft test: NO notifications generated for any student", async () => {
        // Record initial notification counts
        const initialNotifRes = await request("/notifications", { token: studentToken });
        const initialCount = initialNotifRes.body.data?.unreadCount || 0;

        const draftRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `Polish Test Draft ${Date.now()}`,
                description: "Draft should not notify students",
                status: "draft",
                durationMinutes: 30,
                assignedDepartments: ["ALL"],
                questions: [],
            },
            token: coordinatorToken,
        });

        assert.strictEqual(draftRes.status, 201);
        draftId = draftRes.body.data._id;
        cleanupTestIds.push(draftId);

        // Verify student has not received any new notifications
        const afterDraftNotifRes = await request("/notifications", { token: studentToken });
        const afterCount = afterDraftNotifRes.body.data?.unreadCount || 0;
        assert.strictEqual(afterCount, initialCount, "Saving a draft must NOT send notifications to students");
    });

    await test("3. Failed publication (0 questions): NO notifications generated", async () => {
        const initialNotifRes = await request("/notifications", { token: studentToken });
        const initialCount = initialNotifRes.body.data?.unreadCount || 0;

        const pubFailRes = await request(`/coordinator/mock-tests/${draftId}/publish`, {
            method: "PATCH",
            token: coordinatorToken,
        });
        assert.strictEqual(pubFailRes.status, 400, "Publishing 0 questions must fail with 400");

        const afterFailNotifRes = await request("/notifications", { token: studentToken });
        const afterCount = afterFailNotifRes.body.data?.unreadCount || 0;
        assert.strictEqual(afterCount, initialCount, "Failed publication must NOT send notifications");
    });

    let publishedTestId = null;
    await test("4. Coordinator publishes test: Eligible students receive notification with correct link & details", async () => {
        // Create a test with a valid question and publish it targeted to student's department
        const createRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `Final Polish Placement Mock ${Date.now()}`,
                description: "Live mock test for placement drive",
                status: "published",
                durationMinutes: 45,
                assignedDepartments: [studentDept],
                questions: [
                    {
                        questionText: "What is the primary benefit of index structures in databases?",
                        options: [
                            { optionId: "A", text: "Faster query data retrieval" },
                            { optionId: "B", text: "Reduced storage size" },
                        ],
                        correctOption: "A",
                    },
                ],
            },
            token: coordinatorToken,
        });

        assert.strictEqual(createRes.status, 201);
        publishedTestId = createRes.body.data._id;
        cleanupTestIds.push(publishedTestId);

        // Fetch notifications for the eligible student
        const notifRes = await request("/notifications", { token: studentToken });
        assert.strictEqual(notifRes.status, 200);
        const notifs = notifRes.body.data.notifications;
        const testNotif = notifs.find((n) => n.link?.includes(publishedTestId));
        assert(testNotif, "Eligible student must receive notification for the published mock test");
        assert(testNotif.title.includes("Mock Test Published") || testNotif.title.includes("Published"), "Notification title must reflect publication");
        assert(testNotif.message.includes("Final Polish Placement Mock"), "Notification message must mention the test title");
        assert.strictEqual(testNotif.link, `/tests?testId=${publishedTestId}`, "Notification link must target the mock-test page with testId");

        // Fetch notifications for student in Civil Engineering (ineligible)
        const otherNotifRes = await request("/notifications", { token: otherStudentToken });
        const otherNotifs = otherNotifRes.body.data.notifications;
        const otherTestNotif = otherNotifs.find((n) => n.link?.includes(publishedTestId));
        assert(!otherTestNotif, "Ineligible student from different department must NOT receive notification");
    });

    await test("5. Upcoming test publication: notification includes scheduled start time", async () => {
        const futureDate = new Date(Date.now() + 48 * 3600 * 1000); // 48 hours in future
        const upcomingRes = await request("/coordinator/mock-tests", {
            method: "POST",
            data: {
                title: `Scheduled National Grand Mock ${Date.now()}`,
                description: "Upcoming scheduled exam",
                status: "published",
                durationMinutes: 60,
                isScheduled: true,
                startDate: futureDate.toISOString(),
                endDate: new Date(futureDate.getTime() + 24 * 3600 * 1000).toISOString(),
                assignedDepartments: ["ALL"],
                questions: [
                    {
                        questionText: "Which sorting algorithm has optimal worst-case comparison complexity O(N log N)?",
                        options: [
                            { optionId: "A", text: "Merge Sort" },
                            { optionId: "B", text: "Bubble Sort" },
                        ],
                        correctOption: "A",
                    },
                ],
            },
            token: coordinatorToken,
        });

        assert.strictEqual(upcomingRes.status, 201);
        const upcomingTestId = upcomingRes.body.data._id;
        cleanupTestIds.push(upcomingTestId);

        const notifRes = await request("/notifications", { token: studentToken });
        const notifs = notifRes.body.data.notifications;
        const upNotif = notifs.find((n) => n.link?.includes(upcomingTestId));
        assert(upNotif, "Student must receive notification for upcoming scheduled test");
        assert(upNotif.title.includes("Upcoming") || upNotif.title.includes("Scheduled"), "Title must mention upcoming/scheduled");
        assert(upNotif.message.toLowerCase().includes("starts on") || upNotif.message.toLowerCase().includes("scheduled"), "Message must mention start time");
    });

    await test("6. Duplicate prevention: Retrying publish does NOT create duplicate notifications", async () => {
        const notifsBeforeRes = await request("/notifications", { token: studentToken });
        const countBefore = notifsBeforeRes.body.data.notifications.filter((n) => n.link?.includes(publishedTestId)).length;
        assert.strictEqual(countBefore, 1, "Should have exactly 1 notification before retry");

        // Call publish endpoint again on the already published test
        const retryRes = await request(`/coordinator/mock-tests/${publishedTestId}/publish`, {
            method: "PATCH",
            token: coordinatorToken,
        });
        assert.strictEqual(retryRes.status, 200);

        const notifsAfterRes = await request("/notifications", { token: studentToken });
        const countAfter = notifsAfterRes.body.data.notifications.filter((n) => n.link?.includes(publishedTestId)).length;
        assert.strictEqual(countAfter, 1, "Retrying publish must NOT generate a duplicate notification");
    });

    await test("7. Editing an already published test does NOT generate another publication notification", async () => {
        const updateRes = await request(`/coordinator/mock-tests/${publishedTestId}`, {
            method: "PUT",
            data: {
                title: "Updated Title for Polish Placement Mock",
                durationMinutes: 50,
            },
            token: coordinatorToken,
        });
        assert.strictEqual(updateRes.status, 200);

        const notifsRes = await request("/notifications", { token: studentToken });
        const matchingNotifs = notifsRes.body.data.notifications.filter((n) => n.link?.includes(publishedTestId));
        assert.strictEqual(matchingNotifs.length, 1, "Editing already published test must NOT generate another notification");
    });

    await test("8. Notification interaction: mark as read works via existing notification API", async () => {
        const notifsRes = await request("/notifications", { token: studentToken });
        const notif = notifsRes.body.data.notifications.find((n) => n.link?.includes(publishedTestId));
        assert(notif, "Notification must exist");

        const markRes = await request(`/notifications/${notif._id}/read`, {
            method: "PATCH",
            token: studentToken,
        });
        assert.strictEqual(markRes.status, 200);
        assert.strictEqual(markRes.body.data.notification.isRead, true, "Notification must be marked as read");
    });

    await test("9. Clean up test records", async () => {
        const mongoose = (await import("mongoose")).default;
        await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
        const MockTest = (await import("../models/MockTest.js")).default;
        const Notification = (await import("../models/Notification.js")).default;
        const User = (await import("../models/User.js")).default;

        if (cleanupTestIds.length > 0) {
            await MockTest.deleteMany({ _id: { $in: cleanupTestIds } });
            await Notification.deleteMany({ testId: { $in: cleanupTestIds } });
        }
        if (otherStudentId) {
            await User.deleteOne({ _id: otherStudentId });
            await Notification.deleteMany({ user: otherStudentId });
        }
        await mongoose.disconnect();
    });

    console.log(`\n==========================================`);
    console.log(`Deployment Polish Test Results: ${passedCount} passed, ${failedCount} failed.`);
    console.log(`==========================================\n`);
}

runSuite().catch(console.error);
