I'll provide a comprehensive guide focused on how to set correct answers for each question type in Google Forms API, along with complete examples.# Complete Google Forms API Guide: Setting Correct Answers for All Question Types

## **Overview of Auto-Gradable vs Manual Grading**

Questions with correctAnswers (Checkbox, Radio, Dropdown, Short answer) can be auto-graded, while other question types require manual grading. The user's answer is captured and evaluated as text, and to be correct, the answer must match the answer key exactly.

## **Setting Up Quiz Mode**

First, convert your form to a quiz:

```json
{
  "updateSettings": {
    "settings": {
      "quizSettings": {
        "isQuiz": true
      }
    },
    "updateMask": "quizSettings.isQuiz"
  }
}
```

## **Question Types and Correct Answer Implementation**

### **1. Multiple Choice Questions (Radio Buttons)**
**Auto-gradable**: ✅ Yes

```json
{
  "createItem": {
    "item": {
      "title": "Which of these singers was not a member of Destiny's Child?",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 2,
            "correctAnswers": {
              "answers": [{"value": "Rihanna"}]
            },
            "whenRight": {
              "text": "You got it!"
            },
            "whenWrong": {
              "text": "Sorry, that's wrong"
            }
          },
          "choiceQuestion": {
            "type": "RADIO",
            "options": [
              {"value": "Kelly Rowland"},
              {"value": "Beyoncé"},
              {"value": "Rihanna"},
              {"value": "Michelle Williams"}
            ],
            "shuffle": false
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **2. Checkbox Questions (Multiple Selection)**
**Auto-gradable**: ✅ Yes

For checkbox questions, you need multiple correct answers:

```json
{
  "createItem": {
    "item": {
      "title": "Select all programming languages used for web development:",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 3,
            "correctAnswers": {
              "answers": [
                {"value": "JavaScript"},
                {"value": "Python"},
                {"value": "PHP"}
              ]
            },
            "whenRight": {
              "text": "Excellent! You know your web technologies."
            },
            "whenWrong": {
              "text": "Not quite right. Check the correct answers."
            }
          },
          "choiceQuestion": {
            "type": "CHECKBOX",
            "options": [
              {"value": "JavaScript"},
              {"value": "Python"},
              {"value": "PHP"},
              {"value": "C++"},
              {"value": "Assembly"}
            ]
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **3. Dropdown Questions**
**Auto-gradable**: ✅ Yes

```json
{
  "createItem": {
    "item": {
      "title": "What is the capital of France?",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 1,
            "correctAnswers": {
              "answers": [{"value": "Paris"}]
            },
            "whenRight": {
              "text": "Correct! Paris is the capital."
            },
            "whenWrong": {
              "text": "Incorrect. The capital of France is Paris."
            }
          },
          "choiceQuestion": {
            "type": "DROP_DOWN",
            "options": [
              {"value": "London"},
              {"value": "Berlin"},
              {"value": "Paris"},
              {"value": "Madrid"}
            ]
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **4. Short Answer Text Questions**
**Auto-gradable**: ✅ Yes (with exact text matching)

Short answer questions can be auto-graded by adding a correctAnswers field, but you can only provide generalFeedback, not whenRight or whenWrong feedback.

```json
{
  "createItem": {
    "item": {
      "title": "What is the chemical formula for water?",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 2,
            "correctAnswers": {
              "answers": [
                {"value": "H2O"},
                {"value": "h2o"},
                {"value": "H₂O"}
              ]
            },
            "generalFeedback": {
              "text": "The chemical formula for water is H2O, consisting of 2 hydrogen atoms and 1 oxygen atom."
            }
          },
          "textQuestion": {
            "paragraph": false
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **5. Paragraph Text Questions**
**Auto-gradable**: ❌ No - Manual grading only

```json
{
  "createItem": {
    "item": {
      "title": "Explain the concept of photosynthesis in your own words.",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 5,
            "generalFeedback": {
              "text": "This question will be graded manually by the instructor."
            }
          },
          "textQuestion": {
            "paragraph": true
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **6. Scale Questions**
**Auto-gradable**: ❌ No - Manual grading only

```json
{
  "createItem": {
    "item": {
      "title": "Rate your satisfaction with our service",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 1,
            "generalFeedback": {
              "text": "Thank you for your feedback!"
            }
          },
          "scaleQuestion": {
            "low": 1,
            "high": 5,
            "lowLabel": "Very Unsatisfied",
            "highLabel": "Very Satisfied"
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **7. Date Questions**
**Auto-gradable**: ❌ No - Manual grading only

```json
{
  "createItem": {
    "item": {
      "title": "When did World War II end?",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 2,
            "generalFeedback": {
              "text": "World War II ended on September 2, 1945."
            }
          },
          "dateQuestion": {
            "includeTime": false,
            "includeYear": true
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **8. Time Questions**
**Auto-gradable**: ❌ No - Manual grading only

```json
{
  "createItem": {
    "item": {
      "title": "What time do you usually wake up?",
      "questionItem": {
        "question": {
          "required": false,
          "grading": {
            "pointValue": 0,
            "generalFeedback": {
              "text": "Thank you for sharing your schedule information."
            }
          },
          "timeQuestion": {
            "duration": false
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

### **9. File Upload Questions**
**Auto-gradable**: ❌ No - Manual grading only

**Note**: The API currently does not support creating file upload questions.

### **10. Grid Questions (Multiple Choice Grid)**
**Auto-gradable**: ❌ No - Manual grading only

```json
{
  "createItem": {
    "item": {
      "title": "Rate the following aspects of our service",
      "questionGroupItem": {
        "questions": [
          {"rowQuestion": {"title": "Customer Support"}},
          {"rowQuestion": {"title": "Product Quality"}},
          {"rowQuestion": {"title": "Delivery Speed"}}
        ],
        "grid": {
          "columns": {
            "type": "RADIO",
            "options": [
              {"value": "Poor"},
              {"value": "Fair"},
              {"value": "Good"},
              {"value": "Excellent"}
            ]
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

To add grading to grid questions:

```json
{
  "updateItem": {
    "item": {
      "questionGroupItem": {
        "questions": [
          {
            "rowQuestion": {
              "title": "Customer Support"
            },
            "grading": {
              "pointValue": 1,
              "generalFeedback": {
                "text": "This will be manually graded."
              }
            }
          }
        ]
      }
    },
    "location": {"index": 0},
    "updateMask": "questionGroupItem.questions.grading"
  }
}
```

### **11. Rating Questions**
**Auto-gradable**: ❌ No - Manual grading only

```json
{
  "createItem": {
    "item": {
      "title": "Rate your overall experience",
      "questionItem": {
        "question": {
          "required": true,
          "grading": {
            "pointValue": 1,
            "generalFeedback": {
              "text": "Thank you for your rating!"
            }
          },
          "ratingQuestion": {
            "ratingScaleLevel": 5,
            "iconType": "STAR"
          }
        }
      }
    },
    "location": {"index": 0}
  }
}
```

## **Advanced Grading Features**

### **Feedback with Rich Media**
You can include images and YouTube videos in feedback:

```json
{
  "grading": {
    "pointValue": 3,
    "correctAnswers": {
      "answers": [{"value": "Mitochondria"}]
    },
    "whenRight": {
      "text": "Correct! Here's a video explaining more:",
      "youtubeVideo": {
        "youtubeUri": "https://www.youtube.com/watch?v=example"
      }
    },
    "whenWrong": {
      "text": "Not quite right. The powerhouse of the cell is the mitochondria.",
      "image": {
        "sourceUri": "https://example.com/cell-diagram.png",
        "altText": "Cell diagram showing mitochondria"
      }
    }
  }
}
```

### **Complete Quiz Creation Example**

```json
{
  "requests": [
    {
      "updateSettings": {
        "settings": {
          "quizSettings": {
            "isQuiz": true
          }
        },
        "updateMask": "quizSettings.isQuiz"
      }
    },
    {
      "createItem": {
        "item": {
          "title": "What is 2 + 2?",
          "questionItem": {
            "question": {
              "required": true,
              "grading": {
                "pointValue": 1,
                "correctAnswers": {
                  "answers": [
                    {"value": "4"},
                    {"value": "four"}
                  ]
                },
                "generalFeedback": {
                  "text": "2 + 2 equals 4"
                }
              },
              "textQuestion": {
                "paragraph": false
              }
            }
          }
        },
        "location": {"index": 0}
      }
    },
    {
      "createItem": {
        "item": {
          "title": "Select all prime numbers:",
          "questionItem": {
            "question": {
              "required": true,
              "grading": {
                "pointValue": 2,
                "correctAnswers": {
                  "answers": [
                    {"value": "2"},
                    {"value": "3"},
                    {"value": "5"}
                  ]
                },
                "whenRight": {
                  "text": "Perfect! You know your prime numbers."
                },
                "whenWrong": {
                  "text": "Review: Prime numbers are only divisible by 1 and themselves."
                }
              },
              "choiceQuestion": {
                "type": "CHECKBOX",
                "options": [
                  {"value": "1"},
                  {"value": "2"},
                  {"value": "3"},
                  {"value": "4"},
                  {"value": "5"},
                  {"value": "6"}
                ]
              }
            }
          }
        },
        "location": {"index": 1}
      }
    }
  ]
}
```

## **Key Points for Correct Answer Implementation**

1. **Auto-gradable Questions**: Only Checkbox, Radio, Dropdown, and Short answer questions can be auto-graded
2. **Exact Text Matching**: To be correct, the answer must match the answer key exactly
3. **Multiple Correct Answers**: For text questions, provide variations like capitalization differences
4. **Feedback Types**: 
   - `whenRight` and `whenWrong` for multiple choice, checkbox, dropdown
   - `generalFeedback` only for short answer and manual grading questions
5. **Manual Grading**: For other types of questions, grading is not automatic and you can only provide generalFeedback

## **Best Practices**

1. **Text Answer Variations**: Include common variations for short answer questions
2. **Point Values**: Set appropriate point values based on question difficulty
3. **Feedback Quality**: Provide constructive feedback that helps learning
4. **Mixed Question Types**: Combine auto-gradable and manual questions for comprehensive assessment
5. **Release Settings**: Use "Later, after manual review" for quizzes with manual grading components

This comprehensive guide covers all Google Forms API question types and their grading capabilities, ensuring you can implement effective automated and manual grading systems.