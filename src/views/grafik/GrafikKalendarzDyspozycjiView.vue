<template>
  <main class="screen-with-topbar">
    <div class="zamawiarka-menu-topbar">
      <button
        class="zamawiarka-menu-back"
        type="button"
        title="Wróć"
        @click="router.push('/grafik/dyspozycyjnosc')"
      >
        ←
      </button>

      <h2 class="zamawiarka-menu-title">
        KALENDARZ DYSPOZYCYJNOŚCI
      </h2>
    </div>

    <div class="scroll-area">
  <div
    v-if="canManageSchedule"
    class="schedule-view-switcher"
  >
    <button
      type="button"
      class="schedule-view-switcher-button"
      :class="{ active: selectedViewMode === 'mine' }"
      @click="setViewMode('mine')"
    >
      Moja
    </button>

    <button
      type="button"
      class="schedule-view-switcher-button"
      :class="{ active: selectedViewMode === 'employee' }"
      @click="setViewMode('employee')"
    >
      Pracownik
    </button>

    <button
      type="button"
      class="schedule-view-switcher-button"
      :class="{ active: selectedViewMode === 'all' }"
      @click="setViewMode('all')"
    >
      Wszyscy
    </button>
  </div>


   <div
    v-if="canManageSchedule && selectedViewMode === 'employee'"
    style="width: 100%; max-width: 420px; margin: 0 auto 18px;"
  >
    <label
      style="display: block; margin-bottom: 7px; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase;"
    >
      Wybierz pracownika
    </label>

    <select
      v-model="selectedEmployeeId"
      translate="no"
      class="notranslate"
      style="width: 100%; min-height: 48px; padding: 0 42px 0 14px; border: 1px solid #dbe3ee; border-radius: 14px; background: white; color: #1e293b; font-size: 15px; font-weight: 700; outline: none;"
    >
      <option :value="null" disabled>
        Wybierz osobę...
      </option>

      <option
        v-for="employee in activeEmployees"
        :key="employee.id"
        :value="employee.id"
      >
        {{ employee.nazwisko }} {{ employee.imie }}
      </option>
    </select>
  </div>


  <div class="schedule-calendar-actions">
  <button
  type="button"
  class="schedule-multi-select-button"
  :class="{ active: isMultiSelectMode }"
  title="Tryb zaznaczania"
  @click="toggleMultiSelectMode"
>
  ☑️
</button>
</div>



  <div class="schedule-month-header">
  <button
    type="button"
    class="schedule-month-arrow"
    title="Poprzedni miesiąc"
    @click="changeMonth(-1)"
  >
    ‹
  </button>

  <div class="schedule-month-title">
    {{ displayedMonthLabel }}
  </div>

  <button
    type="button"
    class="schedule-month-arrow"
    title="Następny miesiąc"
    @click="changeMonth(1)"
  >
    ›
  </button>
</div>



<div class="schedule-calendar">
  <div class="schedule-weekdays">
    <div
      v-for="weekDay in weekDays"
      :key="weekDay"
      class="schedule-weekday"
    >
      {{ weekDay }}
    </div>
  </div>

  <div class="schedule-calendar-grid">
    <div
      v-for="(day, index) in calendarDays"
      :key="day ? day.toISOString() : `empty-${index}`"
      class="schedule-calendar-cell"
      @click="selectCalendarDay(day)"
      :class="[
        {
          empty: !day,
          today:
            day &&
            formatDateKey(day) === todayDateKey,
          selected:
            day &&
            formatDateKey(day) === selectedDateKey,
          multiSelected:
            day &&
            selectedDateKeys.includes(
              formatDateKey(day)
            )
        },
        getAvailabilityPeriodClasses(day, index)
      ]"
    >
      <template v-if="day">
  <span class="schedule-calendar-day-number">
    {{ day.getDate() }}
  </span>


  <span
  v-if="getAvailabilityForDay(day)"
  class="schedule-availability-status-dot"
  :class="`status-${getAvailabilityForDay(day).type}`"
></span>


<span
  v-if="getAvailabilityForDay(day)?.note?.trim()"
  class="schedule-availability-note-marker"
  title="Ten dzień zawiera notatkę"
>
  N
</span>


<span
  v-if="getAvailabilityForDay(day)?.managerEntry"
  class="schedule-availability-edit-marker"
  title="Dyspozycja zmieniona przez osobę zarządzającą"
>
  E
</span>
  


  <span
    v-if="isMultiSelectMode"
    class="schedule-calendar-checkbox"
    :class="{
      checked: selectedDateKeys.includes(formatDateKey(day))
    }"
  >
    <span
      v-if="selectedDateKeys.includes(formatDateKey(day))"
      class="schedule-calendar-checkbox-mark"
    >
      ✓
    </span>
  </span>
</template>
    </div>
  </div>
</div>



<div
  v-if="selectedViewMode === 'all' && selectedDateKey"
  class="schedule-selected-day-panel"
>
  <div class="schedule-selected-day-label">
    Dyspozycyjność zespołu
  </div>

  <div class="schedule-selected-day-date">
    {{ selectedDateLabel }}
  </div>

  <div
  v-if="isLoadingTeamAvailability"
  class="schedule-selected-day-hint"
>
  Wczytywanie dyspozycyjności zespołu...
</div>


<div
  v-if="!isLoadingTeamAvailability"
  class="schedule-team-position-filter"
>
  <label class="schedule-team-position-filter-label">
    Filtr stanowiska
  </label>

  <select
    v-model="selectedPositionFilter"
    class="schedule-team-position-filter-select"
  >
    <option value="">
      Wszystkie stanowiska
    </option>

    <option
      v-for="position in positionsStore.positions"
      :key="position.id"
      :value="position.id"
    >
      {{ position.nazwa }}
    </option>
  </select>
</div>



<div
  v-if="!isLoadingTeamAvailability"
  class="schedule-team-availability-list"
>
  <div
  v-for="employee in teamAvailabilityForSelectedDay"
  :key="employee.id"
  class="schedule-team-availability-row"
  :class="{
    expanded: expandedTeamEmployeeId === employee.id
  }"
  @click="toggleTeamEmployeeDetails(employee.id)"
>
    <div class="schedule-team-employee">
      <div class="schedule-team-employee-name-row">
  <div class="schedule-team-employee-name">
    {{ employee.nazwisko }} {{ employee.imie }}
  </div>

  <span
    v-if="employee.availability?.note?.trim()"
    class="schedule-team-note-marker"
    title="Pracownik dodał notatkę"
  >
    N
  </span>

  <span
  v-if="employee.availability?.managerEntry"
  class="schedule-team-edit-marker"
  title="Dyspozycja zmieniona przez osobę zarządzającą"
>
  E
</span>


</div>

      <div
  class="schedule-team-employee-status"
  :class="[
    !employee.availability
      ? 'status-full'
      : `status-${employee.availability.type}`
  ]"
>
  {{
  !employee.availability ||
  employee.availability.type === 'full'
    ? 'Mogę cały dzień'
    : employee.availability.type === 'partial'
      ? `Tylko ${employee.availability.timeFrom}–${employee.availability.timeTo}`
      : employee.availability.type === 'preferred_off'
        ? 'Prośba o wolne'
        : 'Nie mogę pracować'
}}
</div>




    </div>


    <div
  v-if="expandedTeamEmployeeId === employee.id"
  class="schedule-team-employee-details"
  @click.stop
>
  <div
    v-if="employee.availability?.note?.trim()"
    class="schedule-team-detail-block"
  >
    <div class="schedule-team-detail-label">
      Notatka
    </div>

    <div class="schedule-team-detail-text">
      {{ employee.availability.note }}
    </div>
  </div>


  <button
  type="button"
  class="schedule-team-edit-button"
  @click.stop="openTeamAvailabilityEdit(employee)"
>
  Edytuj dyspozycję
</button>



  <div class="schedule-team-detail-block">
  <div class="schedule-team-detail-label">
    Kompetencje
  </div>

  <div
    v-if="
      employee.kompetencje &&
      Object.keys(employee.kompetencje).length > 0
    "
    class="schedule-team-competency-list"
  >
    <div
      v-for="positionId in Object.keys(employee.kompetencje)"
      :key="positionId"
      class="schedule-team-competency-row"
    >
      <span class="schedule-team-competency-name">
        {{ getSchedulePositionName(positionId) }}
      </span>

      <span
        class="schedule-team-competency-stars"
        :title="`${employee.kompetencje[positionId]} z 5`"
      >
        <span
          v-for="star in 5"
          :key="star"
          :class="{
            active: employee.kompetencje[positionId] >= star
          }"
        >
          ★
        </span>
      </span>
    </div>
  </div>

  <div
    v-else
    class="schedule-team-detail-text"
  >
    Brak przypisanych kompetencji
  </div>
</div>


  



  <div
  v-if="
    employee.availability?.employeeEntry ||
    employee.availability?.managerEntry
  "
  class="schedule-team-detail-block"
>
  <div class="schedule-team-detail-label">
    Informacje dodatkowe
  </div>

  <div
  v-if="employee.availability?.employeeEntry"
  class="schedule-team-detail-text"
>
  <div>
    Dyspozycja dodana przez
    {{ employee.availability.employeeEntry.enteredByName }}
    dnia
    {{
      formatAvailabilityEntryDate(
        employee.availability.employeeEntry.enteredAt
      )
    }}
  </div>

  <div>
    Stan:
    {{
      formatAvailabilityEntry(
        employee.availability.employeeEntry
      )
    }}
  </div>

  <div
  v-if="isEmployeeEntryNewerThanManager(employee.availability)"
  class="schedule-employee-newer-entry-warning"
>
  Pracownik zaktualizował deklarację po decyzji osoby zarządzającej.
</div>


</div>

 <div
  v-if="employee.availability?.managerEntry"
  class="schedule-team-detail-text schedule-team-manager-edit-info"
>
  Dyspozycja edytowana przez
  {{ employee.availability.managerEntry.enteredByName }}
  dnia
  {{
    formatAvailabilityEntryDate(
      employee.availability.managerEntry.enteredAt
    )
  }}
</div>

<button
  v-if="
    employee.availability?.employeeEntry &&
    employee.availability?.managerEntry
  "
  type="button"
  class="schedule-restore-employee-button"
  :disabled="isSavingTeamAvailability"
  @click.stop="
    restoreEmployeeAvailability(
      employee.id,
      selectedDateKey,
      employee.availability.employeeEntry
    )
  "
>
  Przywróć wersję pracownika i zdejmij blokadę
</button>
</div>

  


</div>


  </div>
</div>
</div>




<div
  v-if="
    selectedViewMode !== 'all' &&
    (selectedDateKey || selectedDateKeys.length > 0)
  "
  class="schedule-selected-day-panel"
>
  <div class="schedule-selected-day-label">
  {{
    selectedDateKeys.length > 0
      ? 'Zaznaczone dni'
      : 'Wybrany dzień'
  }}
</div>

<div class="schedule-selected-day-date">
  {{
    selectedDateKeys.length > 0
      ? selectedDatesLabel
      : selectedDateLabel
  }}
</div>

<div
  v-if="!canEditSelectedAvailability"
  class="schedule-employee-newer-entry-warning"
>
  {{ selectedAvailabilityLockMessage }}
</div>

  <div class="schedule-availability-options">
  <button
    v-for="option in availabilityOptions"
    :key="option.value"
    type="button"
    :disabled="!canEditSelectedAvailability"
    class="schedule-availability-option"
    :class="[
  `color-${option.color}`,
  {
    active: selectedAvailabilityType === option.value
  }
]"
    @click="selectedAvailabilityType = option.value"
  >
    <span class="schedule-availability-option-icon">
      {{ option.icon }}
    </span>

    <span class="schedule-availability-option-content">
      <span class="schedule-availability-option-title">
        {{ option.label }}
      </span>

      <span class="schedule-availability-option-description">
        {{ option.description }}
      </span>
    </span>
  </button>
</div>



<div
  v-if="selectedAvailabilityType === 'partial'"
  class="schedule-availability-time-range"
>
  <label class="schedule-availability-time-field">
    <span class="schedule-availability-time-label">
      Od
    </span>

    <div class="schedule-time-input-wrap">
      <input
        v-model="availabilityTimeFrom"
        type="time"
        :disabled="!canEditSelectedAvailability"
        class="schedule-availability-time-input"
        aria-label="Godzina rozpoczęcia dyspozycyjności"
      >

      <button
        class="schedule-time-picker-button"
        type="button"
        :disabled="!canEditSelectedAvailability"
        title="Wybierz godzinę rozpoczęcia"
        @click="openAvailabilityTimePicker('from')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </button>
    </div>
  </label>

  <label class="schedule-availability-time-field">
    <span class="schedule-availability-time-label">
      Do
    </span>

    <div class="schedule-time-input-wrap">
      <input
        v-model="availabilityTimeTo"
        type="time"
        :disabled="!canEditSelectedAvailability"
        class="schedule-availability-time-input"
        aria-label="Godzina zakończenia dyspozycyjności"
      >

      <button
        class="schedule-time-picker-button"
        type="button"
        :disabled="!canEditSelectedAvailability"
        title="Wybierz godzinę zakończenia"
        @click="openAvailabilityTimePicker('to')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </button>
    </div>
  </label>
</div>





<div class="schedule-availability-note">
  <div class="schedule-availability-note-header">
    <label class="schedule-availability-note-label">
      Notatka
    </label>

    <span class="schedule-availability-note-counter">
      {{ availabilityNote.length }}/{{ availabilityNoteMaxLength }}
    </span>
  </div>

  <textarea
    v-model="availabilityNote"
    :maxlength="availabilityNoteMaxLength"
    :disabled="!canEditSelectedAvailability"
    class="schedule-availability-note-input"
    placeholder="Opcjonalna krótka informacja..."
    rows="3"
  ></textarea>
</div>


<div
  v-if="
    selectedAvailabilityRecord?.employeeEntry ||
    selectedAvailabilityRecord?.managerEntry
  "
  class="schedule-availability-additional-info"
>
  <button
    type="button"
    class="schedule-availability-info-button"
    @click="showAvailabilityAdditionalInfo = !showAvailabilityAdditionalInfo"
  >
    <span class="schedule-availability-info-icon">
      i
    </span>

    <span>
      Informacje dodatkowe
    </span>
  </button>

  <div
    v-if="showAvailabilityAdditionalInfo"
    class="schedule-availability-info-content"
  >
    <div
  v-if="selectedAvailabilityRecord?.employeeEntry"
  class="schedule-availability-info-row"
>
  <strong>Dyspozycja pracownika</strong>

  <span>
    Dodana przez
    {{ selectedAvailabilityRecord.employeeEntry.enteredByName }}
    dnia
    {{
      formatAvailabilityEntryDate(
        selectedAvailabilityRecord.employeeEntry.enteredAt
      )
    }}
  </span>

  <span>
    Stan:
    {{
      formatAvailabilityEntry(
        selectedAvailabilityRecord.employeeEntry
      )
    }}
  </span>


  <span
  v-if="
    isEmployeeEntryNewerThanManager(
      selectedAvailabilityRecord
    )
  "
  class="schedule-employee-newer-entry-warning"
>
  Pracownik zaktualizował deklarację po decyzji osoby zarządzającej.
</span>


</div>

    <div
      v-if="selectedAvailabilityRecord?.managerEntry"
      class="schedule-availability-info-row manager"
    >


    


      <strong>Dyspozycja nadrzędna</strong>

      <span>
        Edytowana przez
        {{ selectedAvailabilityRecord.managerEntry.enteredByName }}
        dnia
        {{
          formatAvailabilityEntryDate(
            selectedAvailabilityRecord.managerEntry.enteredAt
          )
        }}
      </span>
    </div>


    <button
  v-if="
    selectedViewMode === 'employee' &&
    selectedAvailabilityRecord?.employeeEntry &&
    selectedAvailabilityRecord?.managerEntry
  "
  type="button"
  class="schedule-restore-employee-button"
  :disabled="isSavingTeamAvailability"
  @click="
    restoreEmployeeAvailability(
      availabilityEmployeeId,
      selectedDateKey,
      selectedAvailabilityRecord.employeeEntry
    )
  "
>
  Przywróć wersję pracownika i zdejmij blokadę
</button>



  </div>
</div>



<button
  type="button"
  class="schedule-availability-save-button"
  :disabled="
    isSavingAvailability ||
    !canEditSelectedAvailability
  "
  :class="{
    disabled:
      isSavingAvailability ||
      !canEditSelectedAvailability
  }"
  @click="saveAvailability"
>
  {{
    isSavingAvailability
      ? 'Zapisywanie...'
      : 'Zapisz dyspozycyjność'
  }}
</button>




</div>




  
</div>


<div
  v-if="showAvailabilityTimePickerModal"
  class="app-dialog-overlay"
  @click.self="closeAvailabilityTimePicker"
>
  <div class="app-dialog-card schedule-time-dialog">
    <div class="app-dialog-icon">
      🕒
    </div>

    <div class="app-dialog-title">
      Wybierz godzinę
    </div>

    <div class="app-dialog-message">
      Ustaw godzinę i minuty.
    </div>

    <div class="schedule-time-picker-grid">
      <div class="schedule-time-picker-column">
        <div class="schedule-time-picker-label">
          Godzina
        </div>

        <div class="schedule-time-wheel">
          <button
            v-for="hour in hours"
            :key="hour"
            type="button"
            class="schedule-time-wheel-option"
            :class="{
              'schedule-time-wheel-option-active':
                selectedHour === hour
            }"
            @click="selectedHour = hour"
          >
            {{ hour }}
          </button>
        </div>
      </div>

      <div class="schedule-time-picker-separator">
        :
      </div>

      <div class="schedule-time-picker-column">
        <div class="schedule-time-picker-label">
          Minuty
        </div>

        <div class="schedule-time-wheel">
          <button
            v-for="minute in minutes"
            :key="minute"
            type="button"
            class="schedule-time-wheel-option"
            :class="{
              'schedule-time-wheel-option-active':
                selectedMinute === minute
            }"
            @click="selectedMinute = minute"
          >
            {{ minute }}
          </button>
        </div>
      </div>
    </div>

    <div class="schedule-time-picker-preview">
      {{ selectedHour }}:{{ selectedMinute }}
    </div>

    <div class="app-dialog-actions">
      <button
        class="app-dialog-button app-dialog-cancel"
        type="button"
        @click="closeAvailabilityTimePicker"
      >
        Anuluj
      </button>

      <button
        class="app-dialog-button app-dialog-ok"
        type="button"
        @click="applyAvailabilityTime"
      >
        Ustaw
      </button>
    </div>
  </div>
</div>


<div
  v-if="saveResultModal.visible"
  class="app-dialog-overlay"
>
  <div
    class="app-dialog-card schedule-save-result-dialog"
    :class="{
      success: saveResultModal.type === 'success',
      error: saveResultModal.type === 'error'
    }"
  >
    <div class="schedule-save-result-icon">
      {{
        saveResultModal.type === 'success'
          ? '✓'
          : '!'
      }}
    </div>

    <div class="app-dialog-title">
      {{
        saveResultModal.type === 'success'
          ? 'Gotowe'
          : 'Błąd zapisu'
      }}
    </div>

    <div class="app-dialog-message">
      {{ saveResultModal.message }}
    </div>
    <div
  v-if="saveResultModal.requireConfirmation"
  class="app-dialog-actions"
>
  <button
    type="button"
    class="app-dialog-button app-dialog-ok"
    @click="saveResultModal.visible = false"
  >
    OK
  </button>
</div>
  </div>
</div>


  <div
  v-if="isTeamAvailabilityEditOpen && editingTeamEmployee"
  class="schedule-team-edit-modal-overlay"
  @click.self="closeTeamAvailabilityEdit"
>
  <div class="schedule-team-edit-modal">
    <div class="schedule-team-edit-modal-header">
     <div class="schedule-team-edit-modal-heading">
        <div class="schedule-team-edit-modal-label">
          Edycja dyspozycji
        </div>

        <div class="schedule-team-edit-modal-name">
          {{ editingTeamEmployee.nazwisko }}
          {{ editingTeamEmployee.imie }}
        </div>

        <div class="schedule-team-edit-modal-date">
          {{ selectedDateKey }}
        </div>




      </div>

      <button
        type="button"
        class="schedule-team-edit-modal-close"
        @click="closeTeamAvailabilityEdit"
      >
        ×
      </button>
    </div>

    <div class="schedule-availability-options">
      <button
      v-for="option in availabilityOptions"
     :key="option.value"
     type="button"
     class="schedule-availability-option"
     :class="[
      `color-${option.color}`,
      {
        active: teamEditAvailabilityType === option.value
      }
    ]"
    @click="teamEditAvailabilityType = option.value"
  >
    <span class="schedule-availability-option-icon">
      {{ option.icon }}
    </span>

    <span class="schedule-availability-option-content">
      <span class="schedule-availability-option-title">
        {{ option.label }}
      </span>

      <span class="schedule-availability-option-description">
        {{ option.description }}
      </span>
    </span>
  </button>
</div>



<div
  v-if="teamEditAvailabilityType === 'partial'"
  class="schedule-availability-time-range"
>
  <label class="schedule-availability-time-field">
    <span class="schedule-availability-time-label">
      Od
    </span>

    <div class="schedule-time-input-wrap">
      <input
        v-model="teamEditTimeFrom"
        type="time"
        class="schedule-availability-time-input"
        aria-label="Godzina rozpoczęcia dyspozycyjności pracownika"
      >

      <button
        class="schedule-time-picker-button"
        type="button"
        title="Wybierz godzinę rozpoczęcia"
        @click="openAvailabilityTimePicker('team-from')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </button>
    </div>
  </label>

  <label class="schedule-availability-time-field">
    <span class="schedule-availability-time-label">
      Do
    </span>

    <div class="schedule-time-input-wrap">
      <input
        v-model="teamEditTimeTo"
        type="time"
        class="schedule-availability-time-input"
        aria-label="Godzina zakończenia dyspozycyjności pracownika"
      >

      <button
        class="schedule-time-picker-button"
        type="button"
        title="Wybierz godzinę zakończenia"
        @click="openAvailabilityTimePicker('team-to')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3 2"></path>
        </svg>
      </button>
    </div>
  </label>
</div>




<div class="schedule-availability-note">
  <div class="schedule-availability-note-header">
    <label class="schedule-availability-note-label">
      Notatka
    </label>

    <span class="schedule-availability-note-counter">
      {{ teamEditNote.length }}/{{ availabilityNoteMaxLength }}
    </span>
  </div>

  <textarea
    v-model="teamEditNote"
    :maxlength="availabilityNoteMaxLength"
    class="schedule-availability-note-input"
    placeholder="Opcjonalna krótka informacja..."
    rows="3"
  ></textarea>
</div>




<button
  type="button"
  class="schedule-availability-save-button"
  :disabled="isSavingTeamAvailability"
  :class="{ disabled: isSavingTeamAvailability }"
  @click="saveTeamAvailability"
>
  {{
    isSavingTeamAvailability
      ? 'Zapisywanie...'
      : 'Zapisz zmiany'
  }}
</button>


 





  </div>
</div>



  </main>

</template>

<script setup>
import {
  computed,
  onMounted,
  onUnmounted,
  ref,
  watch
} from 'vue'
import { useRouter } from 'vue-router'
import { useEmployeeAuthStore } from '../../stores/employeeAuthStore.js'
import { useEmployeesStore } from '../../stores/employeesStore.js'
import { useSchedulePositionsStore } from '../../stores/schedulePositionsStore.js'
import { useAuthStore } from '../../stores/authStore.js'
import { useScheduleAvailabilityPeriodsStore } from '../../stores/scheduleAvailabilityPeriodsStore.js'
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const employeesStore = useEmployeesStore()
const positionsStore = useSchedulePositionsStore()
const authStore = useAuthStore()
const periodsStore =
  useScheduleAvailabilityPeriodsStore()

const periodsClock = ref(Date.now())
let periodsClockInterval = null

onMounted(async () => {
  await Promise.all([
    employeesStore.fetchEmployees(),
    positionsStore.fetchPositions(),
    periodsStore.fetchPeriods()
  ])

  periodsClockInterval = window.setInterval(() => {
    periodsClock.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  periodsStore.stopPeriodsListener()

  if (periodsClockInterval) {
    window.clearInterval(periodsClockInterval)
    periodsClockInterval = null
  }
})





const canManageSchedule = computed(() => {
  if (!employeeAuthStore.currentEmployee) {
    return true
  }

  return employeeAuthStore.hasPermission(
    'can_manage_schedule'
  )
})

const loggedEmployeeId = computed(() => {
  return employeeAuthStore.currentEmployee?.id || null
})

const selectedEmployeeId = ref(
  employeeAuthStore.currentEmployee?.id || null
)

const selectedViewMode = ref('mine')

const setViewMode = async (mode) => {
  selectedViewMode.value = mode

  if (mode === 'mine') {
    selectedEmployeeId.value = loggedEmployeeId.value
  }

  if (!selectedDateKey.value) {
    return
  }

  if (mode === 'all') {
    await loadTeamAvailabilityForDay(
      selectedDateKey.value
    )
    return
  }

  await loadAvailability()

  loadAvailabilityIntoForm(
    selectedDateKey.value
  )
}



const selectedDateLabel = computed(() => {
  if (!selectedDateKey.value) {
    return ''
  }

  const [year, month, day] = selectedDateKey.value
    .split('-')
    .map(Number)

  const selectedDate = new Date(
    year,
    month - 1,
    day
  )

  return new Intl.DateTimeFormat('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Warsaw'
  }).format(selectedDate)
})


const selectedDatesLabel = computed(() => {
  if (selectedDateKeys.value.length === 0) {
    return ''
  }

  const sortedDateKeys = [...selectedDateKeys.value].sort()

  const groupedDates = new Map()

  sortedDateKeys.forEach(dateKey => {
    const [year, month, day] = dateKey
      .split('-')
      .map(Number)

    const monthKey = `${String(month).padStart(2, '0')}/${year}`

    if (!groupedDates.has(monthKey)) {
      groupedDates.set(monthKey, [])
    }

    groupedDates.get(monthKey).push(day)
  })

  return [...groupedDates.entries()]
    .map(([monthYear, days]) => {
      return `(${days.join(', ')})/${monthYear}`
    })
    .join(' • ')
})



const selectedDateKey = ref(null)

const isMultiSelectMode = ref(false)
const selectedDateKeys = ref([])

const availabilityOptions = [
  {
    value: 'full',
    label: 'Mogę cały dzień',
    description: 'Pełna dostępność',
    icon: '✓',
    color: 'green'
  },
  {
    value: 'partial',
    label: 'Tylko w godzinach',
    description: 'Podaj dostępne godziny',
    icon: '◷',
    color: 'blue'
  },
  {
    value: 'preferred_off',
    label: 'Prośba o wolne',
    description: 'Preferowany dzień wolny',
    icon: '♡',
    color: 'orange'
  },
  {
    value: 'unavailable',
    label: 'Nie mogę pracować',
    description: 'Brak dostępności',
    icon: '×',
    color: 'red'
  }
]


const availabilityEmployeeId = computed(() => {
  if (selectedViewMode.value === 'mine') {
    return loggedEmployeeId.value
  }

  if (selectedViewMode.value === 'employee') {
    return selectedEmployeeId.value
  }

  return null
})


const isManagerEditingEmployee = computed(() => {
  return (
    canManageSchedule.value &&
    selectedViewMode.value === 'employee' &&
    selectedEmployeeId.value
  )
})


const selectedAvailabilityEmployee = computed(() => {
  if (!availabilityEmployeeId.value) {
    return null
  }

  return activeEmployees.value.find(
    employee =>
      employee.id === availabilityEmployeeId.value
  ) || null
})




const availabilityRestaurantId = computed(() => {
  return (
    employeeAuthStore.restaurantId ||
    authStore.currentCompany?.uid ||
    null
  )
})





const datesSelectedForAvailability = computed(() => {
  if (selectedDateKeys.value.length > 0) {
    return [...selectedDateKeys.value].sort()
  }

  if (selectedDateKey.value) {
    return [selectedDateKey.value]
  }

  return []
})

const canEditSelectedAvailability = computed(() => {
  if (canManageSchedule.value) {
    return true
  }

  const selectedDates =
    datesSelectedForAvailability.value

  if (selectedDates.length === 0) {
    return false
  }

  return selectedDates.every(dateKey => {
    return Boolean(
      getEditablePeriodForDateKey(dateKey)
    )
  })
})



const selectedAvailabilityLockMessage = computed(() => {
  const selectedDates =
    datesSelectedForAvailability.value

  const containsBlockedDay =
    selectedDates.some(dateKey => {
      const period =
        getOpenPeriodForDateKey(dateKey)

      return Boolean(
        period &&
        isDateBlockedInPeriod(period, dateKey)
      )
    })

  if (containsBlockedDay) {
    return 'Ten dzień został wyłączony z edycji w obecnym okresie dyspozycji.'
  }

  return 'Ten dzień nie należy obecnie do otwartego okresu dyspozycji. Możesz zobaczyć zapisaną dyspozycję, ale nie możesz jej zmienić.'
})




const isSavingAvailability = ref(false)
const saveResultModal = ref({
  visible: false,
  type: 'success',
  message: ''
})

let saveResultModalTimeout = null

const showSaveResultModal = (
  type,
  message,
  duration = 1000,
  requireConfirmation = false
) => {
  if (saveResultModalTimeout) {
    clearTimeout(saveResultModalTimeout)
  }

  saveResultModal.value = {
   visible: true,
   type,
   message,
   requireConfirmation
  }

  if (!requireConfirmation) {
   saveResultModalTimeout = setTimeout(() => {
    saveResultModal.value.visible = false
   }, duration)
  }
}
const availabilityRecords = ref({})
const isLoadingAvailability = ref(false)
const teamAvailabilityRecords = ref({})
const isLoadingTeamAvailability = ref(false)
const expandedTeamEmployeeId = ref(null)
const selectedPositionFilter = ref('')
const editingTeamEmployee = ref(null)
const isTeamAvailabilityEditOpen = ref(false)
const teamEditAvailabilityType = ref('full')
const teamEditTimeFrom = ref('00:00')
const teamEditTimeTo = ref('00:00')
const teamEditNote = ref('')
const isSavingTeamAvailability = ref(false)
const hasTeamAvailabilityChanges = computed(() => {
  const availability = editingTeamEmployee.value?.availability

  const currentType = availability?.type || 'full'
  const currentTimeFrom =
    currentType === 'partial'
      ? availability?.timeFrom || '00:00'
      : null

  const currentTimeTo =
    currentType === 'partial'
      ? availability?.timeTo || '00:00'
      : null

  const editedTimeFrom =
    teamEditAvailabilityType.value === 'partial'
      ? teamEditTimeFrom.value
      : null

  const editedTimeTo =
    teamEditAvailabilityType.value === 'partial'
      ? teamEditTimeTo.value
      : null

  return (
    teamEditAvailabilityType.value !== currentType ||
    editedTimeFrom !== currentTimeFrom ||
    editedTimeTo !== currentTimeTo ||
    teamEditNote.value.trim() !== (availability?.note || '').trim()
  )
})



const formatAvailabilityEntry = (entry) => {
  if (!entry) {
    return 'Mogę cały dzień'
  }

  if (entry.type === 'full') {
    return entry.note
      ? `Mogę cały dzień. Notatka: ${entry.note}`
      : 'Mogę cały dzień'
  }

  if (entry.type === 'partial') {
    const timeText =
      `Mogę pracować w godzinach ${entry.timeFrom}–${entry.timeTo}`

    return entry.note
      ? `${timeText}. Notatka: ${entry.note}`
      : timeText
  }

  if (entry.type === 'preferred_off') {
    return entry.note
      ? `Prośba o wolne. Notatka: ${entry.note}`
      : 'Prośba o wolne'
  }

  if (entry.type === 'unavailable') {
    return entry.note
      ? `Nie mogę pracować. Notatka: ${entry.note}`
      : 'Nie mogę pracować'
  }

  return 'Brak informacji'
}


const getSchedulePositionName = (positionId) => {
  const position = positionsStore.positions.find(
    item => item.id === positionId
  )

  return position
    ? position.nazwa
    : 'Nieznane stanowisko'
}


const getAvailabilityEntryMilliseconds = (timestamp) => {
  if (!timestamp) {
    return 0
  }

  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }

  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime()
  }

  return new Date(timestamp).getTime()
}

const isEmployeeEntryNewerThanManager = (availability) => {
  if (
    !availability?.employeeEntry?.enteredAt ||
    !availability?.managerEntry?.enteredAt
  ) {
    return false
  }

  return (
    getAvailabilityEntryMilliseconds(
      availability.employeeEntry.enteredAt
    ) >
    getAvailabilityEntryMilliseconds(
      availability.managerEntry.enteredAt
    )
  )
}



const formatAvailabilityEntryDate = (timestamp) => {
  if (!timestamp) {
    return ''
  }

  const date =
    typeof timestamp.toDate === 'function'
      ? timestamp.toDate()
      : new Date(timestamp)

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Warsaw'
  }).format(date)
}








const teamAvailabilityEditor = computed(() => {



  const employee = employeeAuthStore.currentEmployee

  if (employee) {
    return {
      id: employee.id,
      name: `${employee.imie || ''} ${employee.nazwisko || ''}`.trim()
    }
  }

  return {
    id: authStore.currentUser?.uid || null,
    name: 'Administrator'
  }
})


const openTeamAvailabilityEdit = (employee) => {
  editingTeamEmployee.value = employee

  const availability = employee.availability

  if (!availability) {
    teamEditAvailabilityType.value = 'full'
    teamEditTimeFrom.value = '00:00'
    teamEditTimeTo.value = '00:00'
    teamEditNote.value = ''
  } else {
    teamEditAvailabilityType.value = availability.type || 'full'
    teamEditTimeFrom.value = availability.timeFrom || '00:00'
    teamEditTimeTo.value = availability.timeTo || '00:00'
    teamEditNote.value = availability.note || ''
  }

  isTeamAvailabilityEditOpen.value = true
}

const closeTeamAvailabilityEdit = () => {
  editingTeamEmployee.value = null
  isTeamAvailabilityEditOpen.value = false
}


const saveTeamAvailability = async () => {
  if (isSavingTeamAvailability.value) return

    if (!hasTeamAvailabilityChanges.value) {
    closeTeamAvailabilityEdit()

    showSaveResultModal(
      'success',
      'Nie wprowadzono żadnych zmian'
    )

    return
  }

  const restaurantId = availabilityRestaurantId.value
  const employee = editingTeamEmployee.value
  const dateKey = selectedDateKey.value

  if (!restaurantId || !employee || !dateKey) {
    showSaveResultModal(
      'error',
      'Brakuje danych potrzebnych do zapisu'
    )
    return
  }

  if (
    teamEditAvailabilityType.value === 'partial' &&
    teamEditTimeFrom.value === teamEditTimeTo.value
  ) {
    showSaveResultModal(
  'error',
  'Wybierz różne godziny rozpoczęcia i zakończenia.',
  2000
)
    return
  }

  isSavingTeamAvailability.value = true

  try {
    const availabilityPeriod =
      getOpenPeriodForDateKey(dateKey)

    const documentId = `${employee.id}_${dateKey}`

    const availabilityRef = doc(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc',
      documentId
    )

    const currentAvailability =
      employee.availability || null

    const employeeEntry =
  currentAvailability?.employeeEntry || null

    const managerEntry = {
      periodId: availabilityPeriod?.id || null,

      type: teamEditAvailabilityType.value,

      timeFrom:
        teamEditAvailabilityType.value === 'partial'
          ? teamEditTimeFrom.value
          : null,

      timeTo:
        teamEditAvailabilityType.value === 'partial'
          ? teamEditTimeTo.value
          : null,

      note: teamEditNote.value.trim(),

      enteredById:
        teamAvailabilityEditor.value.id,

      enteredByName:
        teamAvailabilityEditor.value.name,

      enteredAt: serverTimestamp()
    }

    const availabilityData = {
      employeeId: employee.id,
      date: dateKey,
      periodId: availabilityPeriod?.id || null,

      type: managerEntry.type,
      timeFrom: managerEntry.timeFrom,
      timeTo: managerEntry.timeTo,
      note: managerEntry.note,

      effectiveSource: 'manager',
      managerEntry,

      updatedAt: serverTimestamp()
    }

    if (employeeEntry) {
      availabilityData.employeeEntry = employeeEntry
    }

    const batch = writeBatch(db)

    batch.set(
      availabilityRef,
      availabilityData
    )

    await batch.commit()
    await loadTeamAvailabilityForDay(dateKey)

    closeTeamAvailabilityEdit()

    showSaveResultModal(
      'success',
      'Zapisano zmianę dyspozycyjności'
    )
  } catch (error) {
    console.error(
      'Błąd zapisu edycji dyspozycyjności:',
      error
    )

    showSaveResultModal(
      'error',
      'Nie udało się zapisać zmiany'
    )
  } finally {
    isSavingTeamAvailability.value = false
  }
}


const restoreEmployeeAvailability = async (
  employeeId,
  dateKey,
  employeeEntry
) => {
  if (
    isSavingTeamAvailability.value ||
    !employeeId ||
    !dateKey ||
    !employeeEntry
  ) {
    return
  }

  const restaurantId = availabilityRestaurantId.value

  if (!restaurantId) {
    showSaveResultModal(
      'error',
      'Nie udało się rozpoznać restauracji.',
      2000
    )
    return
  }

  isSavingTeamAvailability.value = true

  try {
    const availabilityRef = doc(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc',
      `${employeeId}_${dateKey}`
    )

    const availabilityData = {
      employeeId,
      date: dateKey,

      type: employeeEntry.type,
      timeFrom:
        employeeEntry.type === 'partial'
          ? employeeEntry.timeFrom
          : null,
      timeTo:
        employeeEntry.type === 'partial'
          ? employeeEntry.timeTo
          : null,
      note: employeeEntry.note || '',

      effectiveSource: 'employee',
      employeeEntry,

      updatedAt: serverTimestamp()
    }

    const batch = writeBatch(db)

    batch.set(
      availabilityRef,
      availabilityData
    )

    await batch.commit()
    showAvailabilityAdditionalInfo.value = false

    if (selectedViewMode.value === 'all') {
      await loadTeamAvailabilityForDay(dateKey)
    } else {
      await loadAvailability()
      loadAvailabilityIntoForm(dateKey)
    }

    showSaveResultModal(
      'success',
      'Przywrócono wersję pracownika'
    )
  } catch (error) {
    console.error(
      'Błąd przywracania wersji pracownika:',
      error
    )

    showSaveResultModal(
      'error',
      'Nie udało się przywrócić wersji pracownika',
      2000
    )
  } finally {
    isSavingTeamAvailability.value = false
  }
}


const saveEmployeeViewAsManager = async () => {
  const employee = selectedAvailabilityEmployee.value
  const selectedDates = datesSelectedForAvailability.value

  if (!employee || selectedDates.length === 0) {
    showSaveResultModal(
      'error',
      'Brakuje danych potrzebnych do zapisu'
    )
    return
  }

  if (
    selectedAvailabilityType.value === 'partial' &&
    availabilityTimeFrom.value === availabilityTimeTo.value
  ) {
    showSaveResultModal(
      'error',
      'Wybierz różne godziny rozpoczęcia i zakończenia.',
      2000
    )
    return
  }

  isSavingAvailability.value = true

  try {
    const restaurantId = availabilityRestaurantId.value
    const batch = writeBatch(db)
    let changedDatesCount = 0

    selectedDates.forEach(dateKey => {
      const availabilityPeriod =
        getOpenPeriodForDateKey(dateKey)

      const currentAvailability =
        availabilityRecords.value[dateKey] || null

        const currentType =
  currentAvailability?.type || 'full'

const currentTimeFrom =
  currentType === 'partial'
    ? currentAvailability?.timeFrom || '00:00'
    : null

const currentTimeTo =
  currentType === 'partial'
    ? currentAvailability?.timeTo || '00:00'
    : null

const newTimeFrom =
  selectedAvailabilityType.value === 'partial'
    ? availabilityTimeFrom.value
    : null

const newTimeTo =
  selectedAvailabilityType.value === 'partial'
    ? availabilityTimeTo.value
    : null

const hasChanges =
  selectedAvailabilityType.value !== currentType ||
  newTimeFrom !== currentTimeFrom ||
  newTimeTo !== currentTimeTo ||
  availabilityNote.value.trim() !==
    (currentAvailability?.note || '').trim()

if (!hasChanges) {
  return
}

changedDatesCount += 1

      const employeeEntry =
  currentAvailability?.employeeEntry || null

      const managerEntry = {
        periodId: availabilityPeriod?.id || null,

        type: selectedAvailabilityType.value,

        timeFrom:
          selectedAvailabilityType.value === 'partial'
            ? availabilityTimeFrom.value
            : null,

        timeTo:
          selectedAvailabilityType.value === 'partial'
            ? availabilityTimeTo.value
            : null,

        note: availabilityNote.value.trim(),

        enteredById:
          teamAvailabilityEditor.value.id,

        enteredByName:
          teamAvailabilityEditor.value.name,

        enteredAt: serverTimestamp()
      }

      const availabilityData = {
        employeeId: employee.id,
        date: dateKey,
        periodId: availabilityPeriod?.id || null,

        type: managerEntry.type,
        timeFrom: managerEntry.timeFrom,
        timeTo: managerEntry.timeTo,
        note: managerEntry.note,

        effectiveSource: 'manager',
        managerEntry,

        updatedAt: serverTimestamp()
      }

      if (employeeEntry) {
        availabilityData.employeeEntry = employeeEntry
      }

      const availabilityRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc',
        `${employee.id}_${dateKey}`
      )

      batch.set(
        availabilityRef,
        availabilityData
      )
    })

    if (changedDatesCount === 0) {
  showSaveResultModal(
    'success',
    'Nie wprowadzono żadnych zmian'
  )

  return
}

    await batch.commit()
    await loadAvailability()

    if (selectedDateKey.value) {
      loadAvailabilityIntoForm(
        selectedDateKey.value
      )
    }

    if (selectedDates.length > 1) {
      isMultiSelectMode.value = false
      selectedDateKeys.value = []
    }

    showSaveResultModal(
      'success',
      selectedDates.length === 1
        ? 'Zapisano zmianę dyspozycyjności'
        : `Zapisano zmiany dla ${selectedDates.length} dni`
    )
  } catch (error) {
    console.error(
      'Błąd zapisu dyspozycyjności przez managera:',
      error
    )

    showSaveResultModal(
      'error',
      'Nie udało się zapisać zmiany'
    )
  } finally {
    isSavingAvailability.value = false
  }
}



const toggleTeamEmployeeDetails = (employeeId) => {
  expandedTeamEmployeeId.value =
    expandedTeamEmployeeId.value === employeeId
      ? null
      : employeeId
}
const loadTeamAvailabilityForDay = async (dateKey) => {
  const restaurantId = availabilityRestaurantId.value

  if (!restaurantId || !dateKey) {
    teamAvailabilityRecords.value = {}
    return
  }

  isLoadingTeamAvailability.value = true

  try {
    const teamQuery = query(
      collection(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc'
      ),
      where('date', '==', dateKey)
    )

    const snapshot = await getDocs(teamQuery)

    teamAvailabilityRecords.value = snapshot.docs.reduce(
      (records, documentSnapshot) => {
        const data = documentSnapshot.data()

        if (data.employeeId) {
          records[data.employeeId] = {
            id: documentSnapshot.id,
            ...data
          }
        }

        return records
      },
      {}
    )
  } catch (error) {
    console.error(
      'Błąd pobierania dyspozycyjności zespołu:',
      error
    )

    teamAvailabilityRecords.value = {}
  } finally {
    isLoadingTeamAvailability.value = false
  }
}
const loadAvailability = async () => {
  const restaurantId = availabilityRestaurantId.value
  const employeeId = availabilityEmployeeId.value

  if (!restaurantId || !employeeId) {
    availabilityRecords.value = {}
    return
  }

  isLoadingAvailability.value = true

  try {
    const availabilityQuery = query(
      collection(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc'
      ),
      where('employeeId', '==', employeeId)
    )

    const snapshot = await getDocs(availabilityQuery)

    availabilityRecords.value = snapshot.docs.reduce(
      (records, documentSnapshot) => {
        const data = documentSnapshot.data()

        if (data.date) {
          records[data.date] = {
            id: documentSnapshot.id,
            ...data
          }
        }

        return records
      },
      {}
    )
  } catch (error) {
    console.error(
      'Błąd pobierania dyspozycyjności:',
      error
    )

    availabilityRecords.value = {}
  } finally {
    isLoadingAvailability.value = false
  }
}


const getAvailabilityForDay = (day) => {
  if (!day) return null

  return availabilityRecords.value[formatDateKey(day)] || null
}

const loadAvailabilityIntoForm = (dateKey) => {
  const record = availabilityRecords.value[dateKey]

  if (!record) {
    selectedAvailabilityType.value = 'full'
    availabilityTimeFrom.value = '00:00'
    availabilityTimeTo.value = '00:00'
    availabilityNote.value = ''
    return
  }

  selectedAvailabilityType.value = record.type || 'full'
  availabilityTimeFrom.value = record.timeFrom || '00:00'
  availabilityTimeTo.value = record.timeTo || '00:00'
  availabilityNote.value = record.note || ''
}





watch(
  availabilityEmployeeId,
  async () => {
    await loadAvailability()

    if (
      selectedDateKey.value &&
      selectedViewMode.value !== 'all'
    ) {
      loadAvailabilityIntoForm(
        selectedDateKey.value
      )
    }
  },
  { immediate: true }
)




const saveAvailability = async () => {
  if (isSavingAvailability.value) return

  if (isManagerEditingEmployee.value) {
    await saveEmployeeViewAsManager()
    return
  }

  const restaurantId = availabilityRestaurantId.value
  const employeeId = availabilityEmployeeId.value
  const selectedDates = datesSelectedForAvailability.value

  if (!restaurantId) {
    alert('Nie udało się rozpoznać restauracji.')
    return
  }

  if (!employeeId) {
    alert('Nie udało się rozpoznać pracownika.')
    return
  }

  if (selectedDates.length === 0) {
    alert('Wybierz co najmniej jeden dzień.')
    return
  }

  const closedDate = canManageSchedule.value
    ? null
    : selectedDates.find(
        dateKey =>
          !getEditablePeriodForDateKey(dateKey)
      )

  if (closedDate) {
    showSaveResultModal(
      'error',
      'Co najmniej jeden wybrany dzień nie jest już otwarty do wprowadzania dyspozycji.',
      3000
    )

    return
  }

  if (
    selectedAvailabilityType.value === 'partial' &&
    availabilityTimeFrom.value === availabilityTimeTo.value
  ) {
    showSaveResultModal(
  'error',
  'Wybierz różne godziny rozpoczęcia i zakończenia.',
  2000
)
    return
  }

  const employee =
    selectedAvailabilityEmployee.value ||
    employeeAuthStore.currentEmployee

  const employeeName =
    `${employee?.imie || ''} ${employee?.nazwisko || ''}`.trim() ||
    'Pracownik'

  isSavingAvailability.value = true

  try {
    const batch = writeBatch(db)
    const managerEditorNames = new Set()

    selectedDates.forEach(dateKey => {
      const availabilityPeriod =
        getEditablePeriodForDateKey(dateKey)

      const currentAvailability =
        availabilityRecords.value[dateKey] || null

      const existingManagerEntry =
        currentAvailability?.managerEntry || null

      const employeeEntry = {
        periodId: availabilityPeriod?.id || null,

        type: selectedAvailabilityType.value,

        timeFrom:
          selectedAvailabilityType.value === 'partial'
            ? availabilityTimeFrom.value
            : null,

        timeTo:
          selectedAvailabilityType.value === 'partial'
            ? availabilityTimeTo.value
            : null,

        note: availabilityNote.value.trim(),

        enteredById: employeeId,
        enteredByName: employeeName,
        enteredAt: serverTimestamp()
      }

      const availabilityRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc',
        `${employeeId}_${dateKey}`
      )

      if (existingManagerEntry) {
       if (existingManagerEntry.enteredByName) {
          managerEditorNames.add(
            existingManagerEntry.enteredByName
          )
        }
        batch.set(availabilityRef, {
          employeeId,
          date: dateKey,
          periodId: availabilityPeriod?.id || null,

          type: existingManagerEntry.type,
          timeFrom: existingManagerEntry.timeFrom ?? null,
          timeTo: existingManagerEntry.timeTo ?? null,
          note: existingManagerEntry.note || '',

          effectiveSource: 'manager',

          employeeEntry,
          managerEntry: existingManagerEntry,

          updatedAt: serverTimestamp()
        })

        return
      }

      if (
        employeeEntry.type === 'full' &&
        !employeeEntry.note
      ) {
        batch.delete(availabilityRef)
        return
      }

      batch.set(availabilityRef, {
        employeeId,
        date: dateKey,
        periodId: availabilityPeriod?.id || null,

        type: employeeEntry.type,
        timeFrom: employeeEntry.timeFrom,
        timeTo: employeeEntry.timeTo,
        note: employeeEntry.note,

        effectiveSource: 'employee',
        employeeEntry,

        updatedAt: serverTimestamp()
      })
    })

    await batch.commit()
    await loadAvailability()

    if (
      selectedDateKey.value &&
      selectedViewMode.value !== 'all'
    ) {
      loadAvailabilityIntoForm(
        selectedDateKey.value
      )
    }

    if (selectedDates.length > 1) {
      isMultiSelectMode.value = false
      selectedDateKeys.value = []

      selectedAvailabilityType.value = 'full'
      availabilityTimeFrom.value = '00:00'
      availabilityTimeTo.value = '00:00'
      availabilityNote.value = ''
    }

        if (managerEditorNames.size > 0) {
      const editorNames =
        [...managerEditorNames].join(', ')

      showSaveResultModal(
        'success',
        managerEditorNames.size === 1
          ? `Twoja deklaracja została zapisana, ale nadal obowiązuje dyspozycja ustawiona przez: ${editorNames}. Skontaktuj się z tą osobą, jeśli potrzebujesz zmiany.`
          : `Twoja deklaracja została zapisana, ale dla części dni nadal obowiązują dyspozycje osób zarządzających: ${editorNames}.`,
        5000,
        true
      )
    } else {
      showSaveResultModal(
        'success',
        selectedDates.length === 1
          ? 'Zapisano dyspozycyjność'
          : `Zapisano dyspozycyjność dla ${selectedDates.length} dni`
      )
    }
  } catch (error) {
    console.error(
      'Błąd zapisu dyspozycyjności:',
      error
    )

    showSaveResultModal(
      'error',
      'Nie udało się zapisać dyspozycyjności'
    )
  } finally {
    isSavingAvailability.value = false
  }
}

 




const selectedAvailabilityType = ref('full')
const availabilityTimeFrom = ref('00:00')
const availabilityTimeTo = ref('00:00')
const showAvailabilityTimePickerModal = ref(false)
const availabilityTimePickerTarget = ref(null)

const selectedHour = ref('00')
const selectedMinute = ref('00')

const hours = Array.from(
  { length: 24 },
  (_, index) => String(index).padStart(2, '0')
)

const minutes = Array.from(
  { length: 60 },
  (_, index) => String(index).padStart(2, '0')
)

const openAvailabilityTimePicker = (target) => {
  availabilityTimePickerTarget.value = target

  let currentTime = '00:00'

  if (target === 'from') {
    currentTime = availabilityTimeFrom.value
  }

  if (target === 'to') {
    currentTime = availabilityTimeTo.value
  }

  if (target === 'team-from') {
    currentTime = teamEditTimeFrom.value
  }

  if (target === 'team-to') {
    currentTime = teamEditTimeTo.value
  }

  const [hour = '00', minute = '00'] =
    currentTime.split(':')

  selectedHour.value = hour
  selectedMinute.value = minute

  showAvailabilityTimePickerModal.value = true
}

const closeAvailabilityTimePicker = () => {
  showAvailabilityTimePickerModal.value = false
  availabilityTimePickerTarget.value = null
}

const applyAvailabilityTime = () => {
  const selectedTime =
    `${selectedHour.value}:${selectedMinute.value}`

  if (availabilityTimePickerTarget.value === 'from') {
    availabilityTimeFrom.value = selectedTime
  }

  if (availabilityTimePickerTarget.value === 'to') {
    availabilityTimeTo.value = selectedTime
  }

  if (availabilityTimePickerTarget.value === 'team-from') {
    teamEditTimeFrom.value = selectedTime
  }

  if (availabilityTimePickerTarget.value === 'team-to') {
    teamEditTimeTo.value = selectedTime
  }

  closeAvailabilityTimePicker()
}
const availabilityNote = ref('')
const availabilityNoteMaxLength = 60
const showAvailabilityAdditionalInfo = ref(false)
const selectedAvailabilityRecord = computed(() => {
  if (!selectedDateKey.value) {
    return null
  }

  return availabilityRecords.value[selectedDateKey.value] || null
})


watch(
  [
    selectedDateKey,
    selectedEmployeeId,
    selectedViewMode
  ],
  () => {
    showAvailabilityAdditionalInfo.value = false
  }
)





const toggleMultiSelectMode = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value

  selectedDateKey.value = null
  selectedDateKeys.value = []

  selectedAvailabilityType.value = 'full'
  availabilityTimeFrom.value = '00:00'
  availabilityTimeTo.value = '00:00'
  availabilityNote.value = ''
}

const selectCalendarDay = async (day) => {
  if (!day) return

  const dateKey = formatDateKey(day)

  const canEditDate =
    canSelectAvailabilityDate(dateKey)

  if (
    isMultiSelectMode.value &&
    !canEditDate
  ) {
    showSaveResultModal(
      'error',
      'Dyspozycje dla tego dnia nie są obecnie otwarte.',
      2500
    )

    return
  }

  if (isMultiSelectMode.value) {
    const dayIndex = selectedDateKeys.value.indexOf(dateKey)

    if (dayIndex === -1) {
      selectedDateKeys.value.push(dateKey)
    } else {
      selectedDateKeys.value.splice(dayIndex, 1)
    }

    return
  }

  selectedDateKey.value = dateKey

  if (selectedViewMode.value === 'all') {
    await loadTeamAvailabilityForDay(dateKey)
    return
  }

  loadAvailabilityIntoForm(dateKey)
}



const displayedMonth = ref(
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
)


watch(
  displayedMonth,
  () => {
    showAvailabilityAdditionalInfo.value = false
    selectedDateKey.value = null
    expandedTeamEmployeeId.value = null
  }
)




const displayedMonthLabel = computed(() => {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(displayedMonth.value)
})

const changeMonth = (offset) => {
  displayedMonth.value = new Date(
    displayedMonth.value.getFullYear(),
    displayedMonth.value.getMonth() + offset,
    1
  )
}



const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const todayDateKey = new Intl.DateTimeFormat(
  'en-CA',
  {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
).format(new Date())

const getTimestampMilliseconds = (timestamp) => {
  if (!timestamp) {
    return 0
  }

  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis()
  }

  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime()
  }

  return new Date(timestamp).getTime()
}

const isPeriodEffectivelyOpen = (period) => {
  if (period?.status !== 'open') {
    return false
  }

  if (
    getTimestampMilliseconds(period.closesAt) <
    periodsClock.value
  ) {
    return false
  }

  return Boolean(
    period.dateTo &&
    period.dateTo >= todayDateKey
  )
}

const getOpenPeriodForDateKey = (dateKey) => {
  if (!dateKey) {
    return null
  }

  return periodsStore.periods.find(period => {
    return (
      isPeriodEffectivelyOpen(period) &&
      period.dateFrom <= dateKey &&
      period.dateTo >= dateKey
    )
  }) || null
}

const isDateBlockedInPeriod = (period, dateKey) => {
  return Boolean(
    period?.blockedDates?.includes(dateKey)
  )
}

const getEditablePeriodForDateKey = (dateKey) => {
  const period = getOpenPeriodForDateKey(dateKey)

  if (
    !period ||
    isDateBlockedInPeriod(period, dateKey)
  ) {
    return null
  }

  return period
}

const getShiftedDateKey = (dateKey, offset) => {
  const [year, month, day] = dateKey
    .split('-')
    .map(Number)

  return formatDateKey(
    new Date(year, month - 1, day + offset)
  )
}

const getAvailabilityPeriodClasses = (
  day,
  calendarIndex
) => {
  if (!day) {
    return {}
  }

  const dateKey = formatDateKey(day)
  const period = getOpenPeriodForDateKey(dateKey)

  if (!period) {
    return {
      'availability-period-closed': true,
      'availability-period-manager-override':
        canManageSchedule.value
    }
  }

  const columnIndex = calendarIndex % 7

  const previousPeriod =
    columnIndex > 0
      ? getOpenPeriodForDateKey(
          getShiftedDateKey(dateKey, -1)
        )
      : null

  const nextPeriod =
    columnIndex < 6
      ? getOpenPeriodForDateKey(
          getShiftedDateKey(dateKey, 1)
        )
      : null

  const startsRange =
    previousPeriod?.id !== period.id

  const endsRange =
    nextPeriod?.id !== period.id

  return {
    'availability-period-open': true,
    'availability-period-start': startsRange,
    'availability-period-end': endsRange,
    'availability-period-blocked':
      isDateBlockedInPeriod(period, dateKey)
  }
}

const canSelectAvailabilityDate = (dateKey) => {
  if (selectedViewMode.value === 'all') {
    return true
  }

  if (canManageSchedule.value) {
    return true
  }

  return Boolean(
    getEditablePeriodForDateKey(dateKey)
  )
}





const weekDays = [
  'Pn',
  'Wt',
  'Śr',
  'Cz',
  'Pt',
  'Sb',
  'Nd'
]

const calendarDays = computed(() => {
  const year = displayedMonth.value.getFullYear()
  const month = displayedMonth.value.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  const firstWeekDay =
    (firstDayOfMonth.getDay() + 6) % 7

  const days = []

  for (let i = 0; i < firstWeekDay; i += 1) {
    days.push(null)
  }

  for (
    let day = 1;
    day <= lastDayOfMonth.getDate();
    day += 1
  ) {
    days.push(
      new Date(year, month, day)
    )
  }

  return days
})





const activeEmployees = computed(() => {
  return [...(employeesStore.employees || [])]
    .filter(employee => employee.aktywny !== false)
    .sort((a, b) => {
      const lastNameA = (a.nazwisko || '').toLowerCase()
      const lastNameB = (b.nazwisko || '').toLowerCase()

      if (lastNameA !== lastNameB) {
        return lastNameA.localeCompare(lastNameB, 'pl')
      }

      return (a.imie || '').localeCompare(
        b.imie || '',
        'pl'
      )
    })
})


const teamAvailabilityForSelectedDay = computed(() => {
  let employees = activeEmployees.value.map(employee => {
    return {
      ...employee,
      availability:
        teamAvailabilityRecords.value[employee.id] || null
    }
  })

  if (!selectedPositionFilter.value) {
    return employees
  }

  employees = employees.filter(employee => {
    return Boolean(
      employee.kompetencje?.[selectedPositionFilter.value]
    )
  })

  return employees.sort((employeeA, employeeB) => {
    const starsA =
      employeeA.kompetencje?.[selectedPositionFilter.value] || 0

    const starsB =
      employeeB.kompetencje?.[selectedPositionFilter.value] || 0

    return starsB - starsA
  })
})






</script>
