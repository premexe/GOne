import unittest

from app.services.voice_service import VoiceService


class TestVoiceAgentQuestions(unittest.TestCase):
    def test_build_agent_questions_returns_emergency_sequence(self):
        questions = VoiceService.build_agent_questions("Asha", "Severe chest pain and dizziness")
        self.assertEqual(len(questions), 4)
        self.assertIn("what happened", questions[0].lower())
        self.assertIn("breathing", questions[1].lower())
        self.assertIn("pain", questions[2].lower())
        self.assertIn("safe", questions[3].lower())


if __name__ == "__main__":
    unittest.main()
