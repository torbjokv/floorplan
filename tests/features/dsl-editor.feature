Feature: DSL Editor
  As a user
  I want to use a text-based DSL to define floor plans
  So that I can write floor plans in a concise, readable format

  Background:
    Given I am on the floorplan designer page
    And the DSL editor tab is visible

  Scenario: DSL editor tab is available
    When I click on the DSL editor tab
    Then the DSL editor should be visible
    And the DSL editor should have line numbers
    And the DSL editor should be editable

  Scenario: Parse simple room definition
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "livingroom"
    And the room should have width "5000"
    And the room should have depth "4000"
    And the room should be attached to "zeropoint:top-left"

  Scenario: Parse room with label
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom "Living Room" 5000x4000 at zeropoint
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "livingroom"
    And the room should have name "Living Room"

  Scenario: Parse room with explicit anchors
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      room Kitchen 4000x3000 bottom-right at LivingRoom:top-left
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "kitchen"
    And the room should have anchor "bottom-right"
    And the room should be attached to "livingroom:top-left"

  Scenario: Parse room with offset
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      room Kitchen 4000x3000 at LivingRoom:bottom-right (100, 200)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "kitchen"
    And the room should have offset "[100, 200]"

  Scenario: Parse window definition
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          window 1200 at top
      """
    And I wait for the auto-update
    Then the JSON editor should contain a window
    And the window should have room "livingroom:top"
    And the window should have width "1200"
    And the window should have offset "0"

  Scenario: Parse window with offset
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          window 1200 at top (300)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a window
    And the window should have offset "300"

  Scenario: Parse door with default swing
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          door 900 at right
      """
    And I wait for the auto-update
    Then the JSON editor should contain a door
    And the door should have room "livingroom:right"
    And the door should have width "900"
    And the door should have swing "inwards-left"
    And the door should have type "normal"

  Scenario: Parse door with explicit swing direction
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          door 900 inwards-right at right (1000)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a door
    And the door should have swing "inwards-right"
    And the door should have offset "1000"

  Scenario: Parse door with opening type
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          door 900 opening at right
      """
    And I wait for the auto-update
    Then the JSON editor should contain a door
    And the door should have type "opening"

  Scenario: Parse square object
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          object square 800x800 at bottom-left
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room object
    And the object should have type "square"
    And the object should have width "800"
    And the object should have height "800"

  Scenario: Parse circle object
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          object circle 400 at top-right
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room object
    And the object should have type "circle"
    And the object should have width "400"

  Scenario: Parse object with label and color
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          object square "Coffee Table" 800x800 #33d17a at bottom-left (1000, 2000)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room object
    And the object should have text "Coffee Table"
    And the object should have color "#33d17a"
    And the object should have x "1000"
    And the object should have y "2000"

  Scenario: Parse room with part
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          part DiningNook 2000x1500 at parent:bottom-right
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "livingroom"
    And the room should have a part with id "diningnook"
    And the part should have width "2000"
    And the part should have depth "1500"
    And the part should be attached to "parent:bottom-right"

  Scenario: Parse nested elements in part
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          part DiningNook 2000x1500 at parent:bottom-right
              window 800 at right (200)
              object circle "Lamp" 400 #f5c211 at top-right (100, 100)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a window in part "diningnook"
    And the window should have width "800"
    And the part should contain an object with text "Lamp"

  Scenario: Parse doors in parts
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room MainRoom 6000x5000 at zeropoint
          part Extension 2000x2000 at parent:bottom-right
              door 900 inwards-left at left (500)
              door 800 opening at top (300)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a door in part "extension"
    And the JSON editor should contain 2 doors

  Scenario: Parse multiple objects in parts
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room Office 5000x4000 at zeropoint
          part Alcove 1500x1000 at parent:top-right
              object square "Desk" 1200x800 #3584e4 at top-left (100, 100)
              object circle "Chair" 600 #e01b24 at bottom-left (400, 300)
              object square "Shelf" 400x1200 #33d17a at top-right (50, 50)
      """
    And I wait for the auto-update
    Then the part should have 3 objects
    And the part should contain an object with text "Desk"
    And the part should contain an object with text "Chair"
    And the part should contain an object with text "Shelf"

  Scenario: Parse windows, doors, and objects together in parts
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room Bedroom 5000x4000 at zeropoint
          part WalkInCloset 2000x1500 at parent:bottom-left
              window 600 at top (800)
              door 800 inwards-right at right (600)
              object square "Storage" 500x500 #9141ac at bottom-right (100, 100)
      """
    And I wait for the auto-update
    Then the JSON editor should contain a window in part "walkincloset"
    And the JSON editor should contain a door in part "walkincloset"
    And the part should contain an object with text "Storage"

  Scenario: Parse complete floor plan with multiple rooms
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom "Living Room" 5000x4000 at zeropoint
          window 1200 at top (300)
          door 900 inwards-right at right (1000)
          object square "Coffee Table" 800x800 #33d17a at bottom-left (1000, 2000)

      room Kitchen "Kitchen" 4000x3000 at LivingRoom:bottom-right (100, 100)
          window 1000 at left (500)
          door 800 outwards-left at bottom (300)
      """
    And I wait for the auto-update
    Then the JSON editor should contain 2 rooms
    And the JSON editor should contain 2 windows
    And the JSON editor should contain 2 doors

  Scenario: DSL syntax error displays error message
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x at zeropoint
      """
    And I wait for the auto-update
    Then the error panel should be visible
    And the error panel should contain "syntax error"

  Scenario: Convert GUI changes to DSL
    When I switch to the GUI editor
    And I add a new room with id "livingroom"
    And I set the room width to "5000"
    And I set the room depth to "4000"
    And I wait for the auto-update
    And I switch to the DSL editor
    Then the DSL editor should contain "5000x4000"

  Scenario: DSL changes sync to GUI editor
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
          window 1200 at top (300)
      """
    And I wait for the auto-update
    And I switch to the GUI editor
    Then the GUI editor should show a room with id "livingroom"
    And the room should have 1 window

  Scenario: DSL preserves formatting on roundtrip
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom "Living Room" 5000x4000 at zeropoint
          window 1200 at top (300)
          door 900 inwards-right at right (1000)

      room Kitchen 4000x3000 at LivingRoom:bottom-right
      """
    And I wait for the auto-update
    And I switch to the JSON editor
    And I wait for the auto-update
    And I switch to the DSL editor
    Then the DSL editor should contain "room LivingRoom \"Living Room\" 5000x4000 at zeropoint"
    And the DSL editor should contain "window 1200 at top (300)"

  Scenario: Case insensitive room IDs
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      room Kitchen 4000x3000 at LivingRoom:bottom-right
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "livingroom"
    And the JSON editor should contain a room with id "kitchen"
    And the kitchen should be attached to "livingroom:bottom-right"

  Scenario: Both single and double quotes work for labels
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 'Living Room' 5000x4000 at zeropoint
      room Kitchen "Kitchen Area" 4000x3000 at LivingRoom:bottom-right
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with name "Living Room"
    And the JSON editor should contain a room with name "Kitchen Area"

  Scenario: Indentation is flexible
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
       window 1200 at top
          door 900 at right
      """
    And I wait for the auto-update
    Then the JSON editor should contain 1 window
    And the JSON editor should contain 1 door

  Scenario: Comments are supported
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      # Main living area
      room LivingRoom 5000x4000 at zeropoint
          window 1200 at top  # Large window
      """
    And I wait for the auto-update
    Then the JSON editor should contain a room with id "livingroom"

  Scenario: Empty lines are ignored
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint


      room Kitchen 4000x3000 at LivingRoom:bottom-right
      """
    And I wait for the auto-update
    Then the JSON editor should contain 2 rooms

  Scenario: DSL editor has syntax highlighting
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      """
    Then the keyword "room" should be highlighted
    And the room id "LivingRoom" should be highlighted
    And the keyword "at" should be highlighted
    And the keyword "zeropoint" should be highlighted

  Scenario: Undo/redo works in DSL editor
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      """
    And I wait for the auto-update
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      room Kitchen 4000x3000 at LivingRoom:bottom-right
      """
    And I wait for the auto-update
    And I click the undo button
    Then the DSL editor should contain only 1 room definition
    When I click the redo button
    Then the DSL editor should contain 2 room definitions

  Scenario: DSL persists in URL
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      room LivingRoom 5000x4000 at zeropoint
      """
    And I wait for the auto-update
    And I reload the page
    Then the DSL editor should contain "room LivingRoom 5000x4000 at zeropoint"

  Scenario: Shared projects load DSL correctly
    Given I have a shared project URL with DSL content
    When I visit the shared project URL
    And I switch to the DSL editor
    Then the DSL editor should contain the shared floor plan definition

  Scenario: Grid step setting in DSL
    When I switch to the DSL editor
    And I enter the following DSL:
      """
      grid 1000

      room LivingRoom 5000x4000 at zeropoint
      """
    And I wait for the auto-update
    Then the JSON editor should have grid_step "1000"
    And the preview should show grid lines at 1000mm intervals
