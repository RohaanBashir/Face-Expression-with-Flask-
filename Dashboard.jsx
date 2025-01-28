import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';

const Home = () => {
  const videoRef = useRef(null);
  const { memberId } = useParams();

  // State to hold fetched questions
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswerId, setSelectedAnswerId] = useState(null);
  const [isChoiceCorrect, setIsChoiceCorrect] = useState(null);
  const [score, setScore] = useState(0);

  // WebSocket states
  const [emotionId, setEmotionId] = useState('');
  const [liveFrame, setLiveFrame] = useState('');

  // 1. Camera streaming effect
  useEffect(() => {
    const video = videoRef.current;
    const handleCanPlay = () => {
      video.play().catch((err) => console.error('Error playing the video:', err));
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const constraints = { video: { facingMode: 'user' } };
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          if (video) {
            video.srcObject = stream;
            video.addEventListener('canplay', handleCanPlay);
          }
        })
        .catch((err) => {
          console.error('Error accessing the camera: ', err);
        });

      return () => {
        if (video) {
          video.removeEventListener('canplay', handleCanPlay);
          const stream = video.srcObject;
          if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
          }
        }
      };
    }
  }, []);

  // 2. WebSocket integration
  useEffect(() => {
    const socket = io.connect('http://localhost:5000'); // Replace with your server URL if needed

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      socket.emit('start_processing');
    });

    socket.on('emotion_data', (data) => {
      console.log('Received data:', data);
      setEmotionId(data.emotion_id);
      setLiveFrame(`data:image/jpeg;base64,${data.image}`);
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // 3. Fetch questions from the backend
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`http://127.0.0.1:8000/questions/oop/medium/3`);
        if (response.data && Array.isArray(response.data)) {
          const flattenedQuestions = response.data.flatMap((subjectObj) => subjectObj.questions);
          setQuestions(flattenedQuestions);
          console.log('All fetched questions:', flattenedQuestions);
        } else {
          throw new Error('Invalid data structure');
        }
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();
  }, [memberId]);

  const handleAnswerSelect = (answer) => {
    setSelectedAnswerId(answer.id);
    const correct = answer.is_correct;
    setIsChoiceCorrect(correct);

    if (correct) {
      setScore((prevScore) => prevScore + 1);
    }
  };

  const handleNextQuestion = () => {
    setSelectedAnswerId(null);
    setIsChoiceCorrect(null);
    setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
  };

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Left side: camera preview */}
      <div
        style={{
          width: '20%',
          backgroundColor: 'rgb(13, 68, 155)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          flexDirection: 'column',
        }}
      >
        <div style={{ marginBottom: '10px', textAlign: 'center' }}>
          <p>Emotion ID:</p>
          <p>{emotionId}</p>
        </div>

        {/* Live frame */}
        <div
  style={{
    width: '20%',
    backgroundColor: 'rgb(13, 68, 155)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'column',
  }}
>
  <div style={{ marginBottom: '10px', textAlign: 'center' }}>
    <p>Emotion ID:</p>
    <p>{emotionId}</p>
  </div>

  {/* Display the live frame */}
  {liveFrame && (
    <div
      style={{
        position: 'absolute',
        bottom: '-300px',
        left: '-50px', // Move further to the left
        width: '200px', // Increased size
        height: '200px', // Matching height for a circle
        borderRadius: '50%', // Round shape
        overflow: 'hidden', // Ensure image stays within the circle
        border: '4px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Background fallback
      }}
    >
      <img
        src={liveFrame}
        alt="Live Frame"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover', // Ensure the image fills the circle
        }}
      />
    </div>
  )}
</div>

       
      </div>

      {/* Right side: MCQ questions */}
      <div
        style={{
          width: '80%',
          backgroundColor: '#f2f2f2',
          color: 'black',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div style={{ alignSelf: 'flex-end', marginBottom: '1rem' }}>
          Question {currentQuestionIndex + 1} / {questions.length} | Score: {score}
        </div>

        {currentQuestion ? (
          <div
            style={{
              width: '90%',
              maxWidth: '750px',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
              backgroundColor: '#2980b9',
              color: '#fff',
            }}
          >
            <h3 style={{ marginBottom: '1rem' }}>{currentQuestion.text}</h3>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {currentQuestion.answers.map((answer) => {
                const isSelected = answer.id === selectedAnswerId;
                let bgColor = '#e74c3c';

                if (isSelected) {
                  bgColor = isChoiceCorrect ? 'lightgreen' : 'lightcoral';
                }

                return (
                  <li
                    key={answer.id}
                    onClick={() => handleAnswerSelect(answer)}
                    style={{
                      marginBottom: '0.75rem',
                      backgroundColor: bgColor,
                      color: isSelected ? '#000' : '#fff',
                      cursor: 'pointer',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s ease',
                      border: '1px solid #ccc',
                    }}
                  >
                    {answer.text}
                  </li>
                );
              })}
            </ul>

            {selectedAnswerId && (
              <div style={{ marginTop: '1rem' }}>
                {isChoiceCorrect ? (
                  <p style={{ color: 'lightgreen' }}>Correct!</p>
                ) : (
                  <p style={{ color: 'lightcoral' }}>Sorry, that’s incorrect.</p>
                )}
              </div>
            )}

            {selectedAnswerId && (
              <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                <button
                  onClick={handleNextQuestion}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#fff',
                    color: '#2980b9',
                    cursor: 'pointer',
                  }}
                >
                  Next Question
                </button>
              </div>
            )}
          </div>
        ) : (
          <p>Final Score: {score}</p>
        )}
      </div>
    </div>
  );
};

export default Home;
