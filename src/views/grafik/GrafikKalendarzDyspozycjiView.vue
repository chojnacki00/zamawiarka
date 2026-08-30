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
    <div
      v-if="visibleAvailabilityPeriods.length > 0"
      class="schedule-calendar-periods-summary"
    >
      <div
        v-for="period in visibleAvailabilityPeriods"
        :key="period.id"
        class="schedule-calendar-period-summary"
        :class="{
          'current-month': period.isCurrentMonth,
          urgent: period.daysRemaining <= 2
        }"
      >
        <template v-if="canManageSchedule">
          <span
            class="schedule-calendar-period-name"
            :title="period.name"
          >
            {{ period.name }}
          </span>

          <span class="schedule-calendar-period-separator">
            •
          </span>
        </template>

        <span class="schedule-calendar-period-nowrap">
          <template v-if="!canManageSchedule">
            zakres:
          </template>
          {{ period.dateRange }}
        </span>

        <span class="schedule-calendar-period-separator">
          •
        </span>

        <template v-if="canManageSchedule && period.modelName">
          <span
            class="schedule-calendar-period-model"
            :title="period.modelName"
          >
            {{ period.modelName }}
          </span>

          <span class="schedule-calendar-period-separator">
            •
          </span>
        </template>

        <span class="schedule-calendar-period-nowrap">
          {{ canManageSchedule ? 'do' : 'termin do' }}
          {{ period.closesOn }}
        </span>

        <span class="schedule-calendar-period-separator">
          •
        </span>

        <span class="schedule-calendar-period-nowrap">
          {{ formatDaysRemaining(period.daysRemaining) }}
        </span>
      </div>
    </div>

    <button
      type="button"
      class="schedule-multi-select-button"
      style="margin-left: auto;"
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
  <span
    class="schedule-calendar-day-number"
    :class="{
      'coverage-warning':
        getCalendarDayCoverageStatus(day) === 'preferred',
      'coverage-shortage':
        getCalendarDayCoverageStatus(day) === 'shortage'
    }"
  >
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
  v-if="
    !isLoadingTeamAvailability &&
    demandModelsStore.isLoading
  "
  class="schedule-selected-day-hint"
>
  Wczytywanie modelu zapotrzebowania...
</div>


<div
  v-if="
    !isLoadingTeamAvailability &&
    !demandModelsStore.isLoading
  "
  class="schedule-demand-control-panel"
  :class="{
    'has-shortage':
      selectedDayDemandControl.status === 'shortage',
    'has-warning':
      selectedDayDemandControl.status === 'preferred'
  }"
>
  <div class="schedule-demand-control-header">
    <div class="schedule-demand-control-title">
      Kontrola zapotrzebowania
    </div>

    <div
      v-if="selectedDayDemandControl.modelName"
      class="schedule-demand-control-model"
    >
      {{ selectedDayDemandControl.periodName }}
      •
      {{ selectedDayDemandControl.modelName }}
    </div>
  </div>

  <div
    v-if="!selectedDayDemandControl.message"
    class="schedule-demand-control-day-status"
    :class="selectedDayDemandControl.status"
  >
    <template
      v-if="selectedDayDemandControl.status === 'shortage'"
    >
      Nie można zapewnić pełnej obsady.
      Brakujące miejsca:
      {{ selectedDayDemandControl.shortageCount }}.
      <template
        v-if="selectedDayDemandControl.affectedPositionNames?.length"
      >
        Zagrożone stanowiska:
        {{ selectedDayDemandControl.affectedPositionNames.join(', ') }}.
      </template>
    </template>

    <template
      v-else-if="selectedDayDemandControl.status === 'preferred'"
    >
      Obsada możliwa tylko przy nieuwzględnieniu
      {{ selectedDayDemandControl.preferredOffUsedCount }}
      {{ selectedDayDemandControl.preferredOffUsedCount === 1 ? 'prośby' : 'próśb' }}
      o wolne.
    </template>

    <template v-else>
      Obsada możliwa
    </template>
  </div>

  <div
    v-if="selectedDayDemandControl.message"
    class="schedule-demand-control-message"
  >
    {{ selectedDayDemandControl.message }}
  </div>

  <div
    v-else
    class="schedule-demand-control-list"
  >
    <section
      v-for="group in selectedDayDemandControl.groups"
      :key="group.positionId"
      class="schedule-demand-control-group"
    >
      <div class="schedule-demand-control-group-title">
        {{ group.positionName }}
      </div>

      <div class="schedule-demand-control-group-rows">
        <div
          v-for="(slot, slotIndex) in group.slots"
          :key="slot.id"
          class="schedule-demand-control-row"
        >
          <span class="schedule-demand-control-slot-number">
            {{ slotIndex + 1 }}.
          </span>

          <span class="schedule-demand-control-time">
            {{ slot.from }}–{{ slot.to }}
          </span>

        </div>
      </div>
    </section>

    <div class="schedule-demand-control-note">
      Kontrola uwzględnia stanowiska, pełne godziny wakatów oraz
      dyspozycje „mogę w godzinach”. Każdy pracownik jest liczony
      maksymalnie do jednej zmiany dziennie.
    </div>
  </div>
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
    v-if="employee.positionAssignments?.length"
    class="schedule-team-competency-list"
  >
    <div
      v-for="assignment in employee.positionAssignments"
      :key="assignment.positionId"
      class="schedule-team-competency-row"
    >
      <span class="schedule-team-competency-name">
        {{ getSchedulePositionName(assignment.positionId) }}
      </span>

      <span
        class="schedule-team-competency-stars"
        :title="`${assignment.competencyStars} z 5`"
      >
        <span
          v-for="star in 5"
          :key="star"
          :class="{
            active: assignment.competencyStars >= star
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

<button
  v-if="
    employee.availability?.managerEntry &&
    !employee.availability?.employeeEntry
  "
  type="button"
  class="schedule-restore-employee-button"
  :disabled="isSavingTeamAvailability"
  @click.stop="removeManagerAvailability(employee.id, selectedDateKey)"
>
  Usuń dyspozycję managera i zdejmij blokadę
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

<button
  v-if="
    selectedViewMode === 'employee' &&
    selectedAvailabilityRecord?.managerEntry &&
    !selectedAvailabilityRecord?.employeeEntry
  "
  type="button"
  class="schedule-restore-employee-button"
  :disabled="isSavingTeamAvailability"
  @click="removeManagerAvailability(availabilityEmployeeId, selectedDateKey)"
>
  Usuń dyspozycję managera i zdejmij blokadę
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
  @click="saveAvailability()"
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
          : 'Nie można zapisać'
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
  v-if="managerCoverageWarningModal.visible"
  class="app-dialog-overlay"
  @click.self="closeManagerCoverageWarning"
>
  <div class="app-dialog-card">
    <div class="app-dialog-icon">
      ⚠️
    </div>

    <div class="app-dialog-title">
      Ostrzeżenie o obsadzie
    </div>

    <div class="app-dialog-message">
      {{ managerCoverageWarningModal.message }}
    </div>

    <div class="app-dialog-actions">
      <button
        type="button"
        class="app-dialog-button app-dialog-cancel"
        @click="closeManagerCoverageWarning"
      >
        Wróć
      </button>

      <button
        type="button"
        class="app-dialog-button app-dialog-delete"
        @click="confirmManagerAvailabilitySave"
      >
        Zapisz mimo ostrzeżenia
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
  @click="saveTeamAvailability()"
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
import { useScheduleDemandModelsStore } from '../../stores/scheduleDemandModelsStore.js'
import { collection, doc, getDoc, getDocs, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { getCompetencyStars } from '../../utils/employeeAssignments.js'
import {
  isPeriodEffectivelyOpen as isAvailabilityPeriodEffectivelyOpen
} from '../../utils/scheduleCreationValidation.js'
import {
  buildManagerAvailabilityWrite,
  canEditAvailabilityDate,
  findAvailabilityPeriodForDate,
  getAvailabilityDocumentId
} from '../../utils/scheduleAvailability.js'

const router = useRouter()
const employeeAuthStore = useEmployeeAuthStore()
const employeesStore = useEmployeesStore()
const positionsStore = useSchedulePositionsStore()
const authStore = useAuthStore()
const periodsStore =
  useScheduleAvailabilityPeriodsStore()
const demandModelsStore =
  useScheduleDemandModelsStore()

const periodsClock = ref(Date.now())
let periodsClockInterval = null

onMounted(async () => {
  await Promise.all([
    employeesStore.fetchEmployees(),
    positionsStore.fetchPositions(),
    periodsStore.fetchPeriods(),
    demandModelsStore.fetchModels()
  ])

  periodsClockInterval = window.setInterval(() => {
    periodsClock.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  periodsStore.stopPeriodsListener()
  stopAvailabilityListener()
  stopTeamAvailabilityListener()
  stopMonthAvailabilityListener()

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

  if (mode !== 'all') {
    stopTeamAvailabilityListener()
    stopMonthAvailabilityListener()
  } else {
    stopAvailabilityListener()
    loadMonthAvailability()
  }

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
    Boolean(availabilityEmployeeId.value) &&
    (
      selectedViewMode.value === 'mine' ||
      selectedViewMode.value === 'employee'
    )
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
  return employeeAuthStore.restaurantId || null
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
    return canEditAvailabilityDate({
      periods: periodsStore.periods,
      dateKey,
      isEffectivelyOpen: isPeriodEffectivelyOpen
    })
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
let unsubscribeAvailability = null
const teamAvailabilityRecords = ref({})
const isLoadingTeamAvailability = ref(false)
let unsubscribeTeamAvailability = null
const monthAvailabilityRecords = ref({})
let unsubscribeMonthAvailability = null
const expandedTeamEmployeeId = ref(null)
const selectedPositionFilter = ref('')
const editingTeamEmployee = ref(null)
const isTeamAvailabilityEditOpen = ref(false)
const teamEditAvailabilityType = ref('full')
const teamEditTimeFrom = ref('00:00')
const teamEditTimeTo = ref('00:00')
const teamEditNote = ref('')
const isSavingTeamAvailability = ref(false)
const managerCoverageWarningModal = ref({
  visible: false,
  message: '',
  saveSource: null
})
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

const closeManagerCoverageWarning = () => {
  managerCoverageWarningModal.value = {
    visible: false,
    message: '',
    saveSource: null
  }
}

const buildManagerCoverageWarningMessage = (
  currentCoverage,
  proposedCoverage,
  dateKey = ''
) => {
  const datePrefix = dateKey
    ? `Dzień ${formatCompactDateKey(dateKey)}: `
    : ''

  if (proposedCoverage.status === 'shortage') {
    const shortageCount =
      proposedCoverage.shortageCount || 0

    const shortageLabel = shortageCount === 1
      ? '1 wakat pozostanie nieobsadzony'
      : (
          shortageCount % 10 >= 2 &&
          shortageCount % 10 <= 4 &&
          (
            shortageCount % 100 < 12 ||
            shortageCount % 100 > 14
          )
        )
        ? `${shortageCount} wakaty pozostaną nieobsadzone`
        : `${shortageCount} wakatów pozostanie nieobsadzonych`

    const affectedPositions =
      proposedCoverage.affectedPositionNames || []

    const positionsMessage = affectedPositions.length > 0
      ? ` Problem dotyczy stanowisk: ${affectedPositions.join(', ')}.`
      : ''

    const warningBeginning =
      currentCoverage.status === 'shortage'
        ? 'po zapisaniu dzień nadal będzie miał problem z obsadą. '
        : 'ta zmiana spowoduje problem z obsadą. '

    return (
      `${datePrefix}${warningBeginning}` +
      `${shortageLabel}.${positionsMessage}`
    )
  }

  if (proposedCoverage.status === 'preferred') {
    return (
      `${datePrefix}po tej zmianie pełna obsada będzie możliwa ` +
      'tylko z wykorzystaniem pracownika mającego prośbę o wolne.'
    )
  }

  return ''
}

const getManagerCoverageWarning = (
  employee,
  dateKey
) => {
  const currentAvailability =
    teamAvailabilityRecords.value[employee.id] || null

  const currentType =
    currentAvailability?.type || 'full'

  const currentTimeFrom = currentType === 'partial'
    ? currentAvailability?.timeFrom || '00:00'
    : null

  const currentTimeTo = currentType === 'partial'
    ? currentAvailability?.timeTo || '00:00'
    : null

  const proposedType =
    teamEditAvailabilityType.value

  const proposedTimeFrom = proposedType === 'partial'
    ? teamEditTimeFrom.value
    : null

  const proposedTimeTo = proposedType === 'partial'
    ? teamEditTimeTo.value
    : null

  const changesAvailabilityRules =
    proposedType !== currentType ||
    proposedTimeFrom !== currentTimeFrom ||
    proposedTimeTo !== currentTimeTo

  if (!changesAvailabilityRules) {
    return ''
  }

  const currentCoverage = evaluateDayCoverage(
    dateKey,
    teamAvailabilityRecords.value
  )

  const proposedAvailability = {
    type: proposedType,
    timeFrom: proposedTimeFrom,
    timeTo: proposedTimeTo,
    note: teamEditNote.value.trim()
  }

  const proposedCoverage = evaluateDayCoverage(
    dateKey,
    {
      ...teamAvailabilityRecords.value,
      [employee.id]: proposedAvailability
    }
  )

  return buildManagerCoverageWarningMessage(
    currentCoverage,
    proposedCoverage
  )
}

const confirmManagerAvailabilitySave = async () => {
  const saveSource =
    managerCoverageWarningModal.value.saveSource

  closeManagerCoverageWarning()

  if (saveSource === 'employee') {
    await saveEmployeeViewAsManager(true)
    return
  }

  await saveTeamAvailability(true)
}


const saveTeamAvailability = async (
  ignoreCoverageWarning = false,
  retryCount = 0
) => {
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

  if (!ignoreCoverageWarning) {
    const warningMessage = getManagerCoverageWarning(
      employee,
      dateKey
    )

    if (warningMessage) {
      managerCoverageWarningModal.value = {
        visible: true,
        message: warningMessage,
        saveSource: 'team'
      }

      return
    }
  }

  isSavingTeamAvailability.value = true

  try {
    const expectedVersions =
      await fetchAvailabilityDayVersions(
        restaurantId,
        [dateKey]
      )

    const currentTeamAvailability =
      await fetchTeamAvailabilityRecordsForDay(dateKey)

    const availabilityPeriod =
      getPeriodForDateKey(dateKey)

    const currentAvailability =
      currentTeamAvailability[employee.id] || null

    const employeeEntry =
      currentAvailability?.employeeEntry || null

    const managerWrite = buildManagerAvailabilityWrite({
      employeeId: employee.id,
      dateKey,
      periodId: availabilityPeriod?.id || null,
      type: teamEditAvailabilityType.value,
      timeFrom: teamEditTimeFrom.value,
      timeTo: teamEditTimeTo.value,
      note: teamEditNote.value.trim(),
      editorId: teamAvailabilityEditor.value.id,
      editorName: teamAvailabilityEditor.value.name,
      enteredAt: serverTimestamp(),
      employeeEntry
    })

    const availabilityRef = doc(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc',
      managerWrite.documentId
    )

    await commitAvailabilityMutations({
      restaurantId,
      dateKeys: [dateKey],
      expectedVersions,
      mutations: [{
        type: 'set',
        ref: availabilityRef,
        data: managerWrite.data
      }]
    })

    await loadTeamAvailabilityForDay(dateKey)

    closeTeamAvailabilityEdit()

    showSaveResultModal(
      'success',
      'Zapisano zmianę dyspozycyjności'
    )
  } catch (error) {
    if (
      isAvailabilityDayConflict(error) &&
      retryCount < 1
    ) {
      isSavingTeamAvailability.value = false

      await loadTeamAvailabilityForDay(dateKey)
      await saveTeamAvailability(false, retryCount + 1)
      return
    }

    console.error(
      'Błąd zapisu edycji dyspozycyjności:',
      error
    )

    showSaveResultModal(
      'error',
      isAvailabilityDayConflict(error)
        ? 'Dane tego dnia zmieniły się ponownie. Spróbuj zapisać jeszcze raz.'
        : 'Nie udało się zapisać zmiany'
    )
  } finally {
    isSavingTeamAvailability.value = false
  }
}


const restoreEmployeeAvailability = async (
  employeeId,
  dateKey,
  employeeEntry,
  retryCount = 0
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
    const expectedVersions =
      await fetchAvailabilityDayVersions(
        restaurantId,
        [dateKey]
      )

    const currentTeamAvailability =
      await fetchTeamAvailabilityRecordsForDay(dateKey)

    const restoredEmployeeEntry =
      currentTeamAvailability[employeeId]
        ?.employeeEntry || employeeEntry

    const availabilityRef = doc(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc',
      getAvailabilityDocumentId(employeeId, dateKey)
    )

    const availabilityData = {
      employeeId,
      date: dateKey,

      type: restoredEmployeeEntry.type,
      timeFrom:
        restoredEmployeeEntry.type === 'partial'
          ? restoredEmployeeEntry.timeFrom
          : null,
      timeTo:
        restoredEmployeeEntry.type === 'partial'
          ? restoredEmployeeEntry.timeTo
          : null,
      note: restoredEmployeeEntry.note || '',

      effectiveSource: 'employee',
      employeeEntry: restoredEmployeeEntry,

      updatedAt: serverTimestamp()
    }

    await commitAvailabilityMutations({
      restaurantId,
      dateKeys: [dateKey],
      expectedVersions,
      mutations: [
        {
          type: 'set',
          ref: availabilityRef,
          data: availabilityData
        }
      ]
    })

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
    if (
      isAvailabilityDayConflict(error) &&
      retryCount < 1
    ) {
      isSavingTeamAvailability.value = false

      if (selectedViewMode.value === 'all') {
        await loadTeamAvailabilityForDay(dateKey)
      } else {
        await loadAvailability()
      }

      await restoreEmployeeAvailability(
        employeeId,
        dateKey,
        employeeEntry,
        retryCount + 1
      )

      return
    }

    console.error(
      'Błąd przywracania wersji pracownika:',
      error
    )

    showSaveResultModal(
      'error',
      isAvailabilityDayConflict(error)
        ? 'Dane tego dnia zmieniły się ponownie. Spróbuj przywrócić wersję jeszcze raz.'
        : 'Nie udało się przywrócić wersji pracownika',
      2000
    )
  } finally {
    isSavingTeamAvailability.value = false
  }
}


const getEmployeeViewManagerCoverageWarning = async (
  employee,
  selectedDates
) => {
  for (const dateKey of selectedDates) {
    const currentTeamAvailability =
      await fetchTeamAvailabilityRecordsForDay(dateKey)

    const currentAvailability =
      currentTeamAvailability[employee.id] || null

    const currentType =
      currentAvailability?.type || 'full'

    const currentTimeFrom = currentType === 'partial'
      ? currentAvailability?.timeFrom || '00:00'
      : null

    const currentTimeTo = currentType === 'partial'
      ? currentAvailability?.timeTo || '00:00'
      : null

    const proposedType =
      selectedAvailabilityType.value

    const proposedTimeFrom = proposedType === 'partial'
      ? availabilityTimeFrom.value
      : null

    const proposedTimeTo = proposedType === 'partial'
      ? availabilityTimeTo.value
      : null

    const changesAvailabilityRules =
      proposedType !== currentType ||
      proposedTimeFrom !== currentTimeFrom ||
      proposedTimeTo !== currentTimeTo

    if (!changesAvailabilityRules) {
      continue
    }

    const currentCoverage = evaluateDayCoverage(
      dateKey,
      currentTeamAvailability
    )

    const proposedCoverage = evaluateDayCoverage(
      dateKey,
      {
        ...currentTeamAvailability,
        [employee.id]: {
          type: proposedType,
          timeFrom: proposedTimeFrom,
          timeTo: proposedTimeTo,
          note: availabilityNote.value.trim()
        }
      }
    )

    const warningMessage =
      buildManagerCoverageWarningMessage(
        currentCoverage,
        proposedCoverage,
        dateKey
      )

    if (warningMessage) {
      return warningMessage
    }
  }

  return ''
}

const saveEmployeeViewAsManager = async (
  ignoreCoverageWarning = false,
  retryCount = 0
) => {
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

  if (!ignoreCoverageWarning) {
    const warningMessage =
      await getEmployeeViewManagerCoverageWarning(
        employee,
        selectedDates
      )

    if (warningMessage) {
      managerCoverageWarningModal.value = {
        visible: true,
        message: warningMessage,
        saveSource: 'employee'
      }

      return
    }
  }

  isSavingAvailability.value = true

  try {
    const restaurantId = availabilityRestaurantId.value
    const expectedVersions =
      await fetchAvailabilityDayVersions(
        restaurantId,
        selectedDates
      )

    const currentTeamSnapshots = await Promise.all(
      selectedDates.map(dateKey => {
        return fetchTeamAvailabilityRecordsForDay(dateKey)
      })
    )

    const currentTeamAvailabilityByDate =
      selectedDates.reduce((records, dateKey, index) => {
        records[dateKey] = currentTeamSnapshots[index]
        return records
      }, {})

    const mutations = []
    const changedDateKeys = []
    let changedDatesCount = 0

    selectedDates.forEach(dateKey => {
      const availabilityPeriod =
        getPeriodForDateKey(dateKey)

      const currentAvailability =
        (
          currentTeamAvailabilityByDate[dateKey] || {}
        )[employee.id] || null

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
changedDateKeys.push(dateKey)

      const employeeEntry =
  currentAvailability?.employeeEntry || null

      const managerWrite = buildManagerAvailabilityWrite({
        employeeId: employee.id,
        dateKey,
        periodId: availabilityPeriod?.id || null,
        type: selectedAvailabilityType.value,
        timeFrom: availabilityTimeFrom.value,
        timeTo: availabilityTimeTo.value,
        note: availabilityNote.value.trim(),
        editorId: teamAvailabilityEditor.value.id,
        editorName: teamAvailabilityEditor.value.name,
        enteredAt: serverTimestamp(),
        employeeEntry
      })

      const availabilityRef = doc(
        db,
        'users',
        restaurantId,
        'grafik_dyspozycyjnosc',
        managerWrite.documentId
      )

      mutations.push({
        type: 'set',
        ref: availabilityRef,
        data: managerWrite.data
      })
    })

    if (changedDatesCount === 0) {
  showSaveResultModal(
    'success',
    'Nie wprowadzono żadnych zmian'
  )

  return
}

    await commitAvailabilityMutations({
      restaurantId,
      dateKeys: changedDateKeys,
      expectedVersions,
      mutations
    })

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
    if (
      isAvailabilityDayConflict(error) &&
      retryCount < 1
    ) {
      isSavingAvailability.value = false

      await loadAvailability()
      await saveEmployeeViewAsManager(
        false,
        retryCount + 1
      )

      return
    }

    console.error(
      'Błąd zapisu dyspozycyjności przez managera:',
      error
    )

    showSaveResultModal(
      'error',
      isAvailabilityDayConflict(error)
        ? 'Dane jednego z dni zmieniły się ponownie. Spróbuj zapisać jeszcze raz.'
        : 'Nie udało się zapisać zmiany'
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

const fetchTeamAvailabilityRecordsForDay = async (
  dateKey
) => {
  const restaurantId = availabilityRestaurantId.value

  if (!restaurantId || !dateKey) {
    return {}
  }

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

  return snapshot.docs.reduce(
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
}

const stopTeamAvailabilityListener = () => {
  if (!unsubscribeTeamAvailability) {
    return
  }

  unsubscribeTeamAvailability()
  unsubscribeTeamAvailability = null
}

const stopMonthAvailabilityListener = () => {
  if (!unsubscribeMonthAvailability) {
    return
  }

  unsubscribeMonthAvailability()
  unsubscribeMonthAvailability = null
}

const loadMonthAvailability = () => {
  const restaurantId = availabilityRestaurantId.value

  stopMonthAvailabilityListener()
  monthAvailabilityRecords.value = {}

  if (
    !restaurantId ||
    !canManageSchedule.value ||
    selectedViewMode.value !== 'all'
  ) {
    return
  }

  const monthStart = formatDateKey(
    new Date(
      displayedMonth.value.getFullYear(),
      displayedMonth.value.getMonth(),
      1
    )
  )

  const monthEnd = formatDateKey(
    new Date(
      displayedMonth.value.getFullYear(),
      displayedMonth.value.getMonth() + 1,
      0
    )
  )

  const monthQuery = query(
    collection(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc'
    ),
    where('date', '>=', monthStart),
    where('date', '<=', monthEnd)
  )

  unsubscribeMonthAvailability = onSnapshot(
    monthQuery,
    snapshot => {
      const recordsByDate = {}

      snapshot.docs.forEach(documentSnapshot => {
        const data = documentSnapshot.data()

        if (!data.date || !data.employeeId) {
          return
        }

        if (!recordsByDate[data.date]) {
          recordsByDate[data.date] = {}
        }

        recordsByDate[data.date][data.employeeId] = {
          id: documentSnapshot.id,
          ...data
        }
      })

      monthAvailabilityRecords.value = recordsByDate
    },
    error => {
      console.error(
        'Błąd pobierania statusów obsady miesiąca:',
        error
      )

      monthAvailabilityRecords.value = {}
    }
  )
}

const loadTeamAvailabilityForDay = async (dateKey) => {
  const restaurantId = availabilityRestaurantId.value

  stopTeamAvailabilityListener()

  if (!restaurantId || !dateKey) {
    teamAvailabilityRecords.value = {}
    return
  }

  isLoadingTeamAvailability.value = true

  const teamQuery = query(
    collection(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc'
    ),
    where('date', '==', dateKey)
  )

  return new Promise((resolve, reject) => {
    let isFirstSnapshot = true

    unsubscribeTeamAvailability = onSnapshot(
      teamQuery,
      snapshot => {
        teamAvailabilityRecords.value =
          snapshot.docs.reduce(
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

        isLoadingTeamAvailability.value = false

        if (isFirstSnapshot) {
          isFirstSnapshot = false
          resolve()
        }
      },
      error => {
        console.error(
          'Błąd pobierania dyspozycyjności zespołu:',
          error
        )

        teamAvailabilityRecords.value = {}
        isLoadingTeamAvailability.value = false

        if (isFirstSnapshot) {
          isFirstSnapshot = false
          reject(error)
        }
      }
    )
  })
}
const stopAvailabilityListener = () => {
  if (!unsubscribeAvailability) {
    return
  }

  unsubscribeAvailability()
  unsubscribeAvailability = null
}

const loadAvailability = async () => {
  const restaurantId = availabilityRestaurantId.value
  const employeeId = availabilityEmployeeId.value

  stopAvailabilityListener()

  if (!restaurantId || !employeeId) {
    availabilityRecords.value = {}
    return
  }

  isLoadingAvailability.value = true

  const availabilityQuery = query(
    collection(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc'
    ),
    where('employeeId', '==', employeeId)
  )

  return new Promise(resolve => {
    let isFirstSnapshot = true

    unsubscribeAvailability = onSnapshot(
      availabilityQuery,
      snapshot => {
        availabilityRecords.value =
          snapshot.docs.reduce(
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

        isLoadingAvailability.value = false

        if (isFirstSnapshot) {
          isFirstSnapshot = false
          resolve()
        }
      },
      error => {
        console.error(
          'Błąd nasłuchiwania dyspozycyjności:',
          error
        )

        availabilityRecords.value = {}
        isLoadingAvailability.value = false

        if (isFirstSnapshot) {
          isFirstSnapshot = false
          resolve()
        }
      }
    )
  })
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

const getProposedEmployeeAvailability = (
  currentAvailability
) => {
  if (currentAvailability?.managerEntry) {
    return currentAvailability
  }

  return {
    type: selectedAvailabilityType.value,
    timeFrom:
      selectedAvailabilityType.value === 'partial'
        ? availabilityTimeFrom.value
        : null,
    timeTo:
      selectedAvailabilityType.value === 'partial'
        ? availabilityTimeTo.value
        : null,
    note: availabilityNote.value.trim()
  }
}

const validateEmployeeAvailabilityCoverage = async (
  employeeId,
  selectedDates
) => {
  const blockedChanges = []
  const warningDates = []
  const teamAvailabilityByDate = {}

  for (const dateKey of selectedDates) {
    const currentTeamAvailability =
      await fetchTeamAvailabilityRecordsForDay(dateKey)

    teamAvailabilityByDate[dateKey] =
      currentTeamAvailability

    const currentCoverage = evaluateDayCoverage(
      dateKey,
      currentTeamAvailability
    )

    const proposedAvailability =
      getProposedEmployeeAvailability(
        currentTeamAvailability[employeeId] || null
      )

    const proposedTeamAvailability = {
      ...currentTeamAvailability,
      [employeeId]: proposedAvailability
    }

    const proposedCoverage = evaluateDayCoverage(
      dateKey,
      proposedTeamAvailability
    )

    const currentMatchedCount =
      Number(currentCoverage.matchedCount || 0)

    const proposedMatchedCount =
      Number(proposedCoverage.matchedCount || 0)

    const currentAffectedPositions = new Set(
      currentCoverage.affectedPositionNames || []
    )

    const introducesNewAffectedPosition =
      (proposedCoverage.affectedPositionNames || [])
        .some(positionName => {
          return !currentAffectedPositions.has(positionName)
        })

    const worsensCoverage =
      proposedMatchedCount < currentMatchedCount ||
      (
        proposedCoverage.shortageCount > 0 &&
        introducesNewAffectedPosition
      )

    if (
      selectedAvailabilityType.value !== 'preferred_off' &&
      worsensCoverage
    ) {
      blockedChanges.push({
        dateKey,
        affectedPositionNames:
          proposedCoverage.affectedPositionNames || []
      })

      continue
    }

    if (proposedCoverage.status === 'preferred') {
      warningDates.push(dateKey)
    }
  }

  return {
    blockedChanges,
    warningDates,
    teamAvailabilityByDate
  }
}




const saveAvailability = async (retryCount = 0) => {
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

  const submittedAvailabilityType =
    selectedAvailabilityType.value

  isSavingAvailability.value = true

  try {
    const expectedVersions =
      await fetchAvailabilityDayVersions(
        restaurantId,
        selectedDates
      )

    const coverageValidation =
      await validateEmployeeAvailabilityCoverage(
        employeeId,
        selectedDates
      )

    if (coverageValidation.blockedChanges.length > 0) {
      const firstBlockedChange =
        coverageValidation.blockedChanges[0]

      const positionsText =
        firstBlockedChange.affectedPositionNames.length > 0
          ? ` Zagrożone stanowiska: ${firstBlockedChange.affectedPositionNames.join(', ')}.`
          : ''

      showSaveResultModal(
        'error',
        `Nie możesz zapisać tej dyspozycji dla ${formatCompactDateKey(firstBlockedChange.dateKey)}. Po tej zmianie pogorszyłaby się możliwość zapewnienia pełnej obsady.${positionsText} Skontaktuj się z managerem.`,
        5000,
        true
      )

      return
    }

    const mutations = []
    const managerEditorNames = new Set()

    selectedDates.forEach(dateKey => {
      const availabilityPeriod =
        getEditablePeriodForDateKey(dateKey)

      const currentAvailability =
        (
          coverageValidation
            .teamAvailabilityByDate[dateKey] || {}
        )[employeeId] || null

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
      getAvailabilityDocumentId(employeeId, dateKey)
      )

      if (existingManagerEntry) {
       if (existingManagerEntry.enteredByName) {
          managerEditorNames.add(
            existingManagerEntry.enteredByName
          )
        }
        mutations.push({
          type: 'set',
          ref: availabilityRef,
          data: {
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
          }
        })

        return
      }

      if (
        employeeEntry.type === 'full' &&
        !employeeEntry.note
      ) {
        mutations.push({
          type: 'delete',
          ref: availabilityRef
        })
        return
      }

      mutations.push({
        type: 'set',
        ref: availabilityRef,
        data: {
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
        }
      })
    })

    await commitAvailabilityMutations({
      restaurantId,
      dateKeys: selectedDates,
      expectedVersions,
      mutations
    })

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
    } else if (
      coverageValidation.warningDates.length > 0
    ) {
      showSaveResultModal(
        'success',
        submittedAvailabilityType === 'preferred_off'
          ? 'Prośba została zapisana, ale zapewnienie pełnej obsady może wymagać jej nieuwzględnienia.'
          : 'Dyspozycja została zapisana, ale pełna obsada może wymagać wykorzystania osoby z prośbą o wolne.',
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
    if (
      isAvailabilityDayConflict(error) &&
      retryCount < 1
    ) {
      isSavingAvailability.value = false

      await loadAvailability()
      await saveAvailability(retryCount + 1)
      return
    }

    console.error(
      'Błąd zapisu dyspozycyjności:',
      error
    )

    showSaveResultModal(
      'error',
      isAvailabilityDayConflict(error)
        ? 'Dane jednego z dni zmieniły się ponownie. Spróbuj zapisać jeszcze raz.'
        : 'Nie udało się zapisać dyspozycyjności'
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

const doesAvailabilityFormMatchRecord = (record) => {
  const recordType = record?.type || 'full'

  const recordTimeFrom = recordType === 'partial'
    ? record?.timeFrom || '00:00'
    : null

  const recordTimeTo = recordType === 'partial'
    ? record?.timeTo || '00:00'
    : null

  const formTimeFrom =
    selectedAvailabilityType.value === 'partial'
      ? availabilityTimeFrom.value
      : null

  const formTimeTo =
    selectedAvailabilityType.value === 'partial'
      ? availabilityTimeTo.value
      : null

  return (
    selectedAvailabilityType.value === recordType &&
    formTimeFrom === recordTimeFrom &&
    formTimeTo === recordTimeTo &&
    availabilityNote.value.trim() ===
      (record?.note || '').trim()
  )
}

watch(
  selectedAvailabilityRecord,
  (newRecord, previousRecord) => {
    if (
      selectedViewMode.value === 'all' ||
      !selectedDateKey.value ||
      isMultiSelectMode.value ||
      !doesAvailabilityFormMatchRecord(previousRecord)
    ) {
      return
    }

    loadAvailabilityIntoForm(
      selectedDateKey.value
    )
  }
)


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
    stopTeamAvailabilityListener()
    teamAvailabilityRecords.value = {}

    if (selectedViewMode.value === 'all') {
      loadMonthAvailability()
    }
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



const formatCompactDateKey = (dateKey) => {
  if (!dateKey) {
    return '--.--'
  }

  const [, month, day] = dateKey.split('-')

  return `${day}.${month}`
}

const getDateFromTimestamp = (timestamp) => {
  if (!timestamp) {
    return null
  }

  const date =
    typeof timestamp.toDate === 'function'
      ? timestamp.toDate()
      : new Date(timestamp)

  return Number.isNaN(date.getTime())
    ? null
    : date
}

const getWarsawDateKey = (date) => {
  const parts = new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }
  ).formatToParts(date)

  const getPart = (type) => {
    return parts.find(part => part.type === type)?.value || ''
  }

  return (
    `${getPart('year')}-` +
    `${getPart('month')}-` +
    getPart('day')
  )
}

const getDaysBetweenDateKeys = (
  firstDateKey,
  secondDateKey
) => {
  const toUtcDay = (dateKey) => {
    const [year, month, day] = dateKey
      .split('-')
      .map(Number)

    return Date.UTC(year, month - 1, day)
  }

  return Math.max(
    0,
    Math.round(
      (
        toUtcDay(secondDateKey) -
        toUtcDay(firstDateKey)
      ) / 86400000
    )
  )
}

const getDemandModelName = (modelId) => {
  if (!modelId) return ''

  const model = demandModelsStore.models.find(
    item => item.id === modelId
  )

  return model?.name || ''
}

const removeManagerAvailability = async (
  employeeId,
  dateKey,
  retryCount = 0
) => {
  if (
    isSavingTeamAvailability.value ||
    !employeeId ||
    !dateKey
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

  try {
    const expectedVersions =
      await fetchAvailabilityDayVersions(
        restaurantId,
        [dateKey]
      )

    const currentTeamAvailability =
      await fetchTeamAvailabilityRecordsForDay(dateKey)

    const currentAvailability =
      currentTeamAvailability[employeeId] || null

    if (currentAvailability?.employeeEntry) {
      await restoreEmployeeAvailability(
        employeeId,
        dateKey,
        currentAvailability.employeeEntry
      )
      return
    }

    if (!currentAvailability?.managerEntry) {
      showSaveResultModal(
        'success',
        'Blokada jest już zdjęta',
        1800
      )
      return
    }

    isSavingTeamAvailability.value = true

    const availabilityRef = doc(
      db,
      'users',
      restaurantId,
      'grafik_dyspozycyjnosc',
      getAvailabilityDocumentId(employeeId, dateKey)
    )

    await commitAvailabilityMutations({
      restaurantId,
      dateKeys: [dateKey],
      expectedVersions,
      mutations: [{ type: 'delete', ref: availabilityRef }]
    })

    showAvailabilityAdditionalInfo.value = false

    if (selectedViewMode.value === 'all') {
      await loadTeamAvailabilityForDay(dateKey)
    } else {
      await loadAvailability()
      loadAvailabilityIntoForm(dateKey)
    }

    showSaveResultModal(
      'success',
      'Usunięto dyspozycję managera i zdjęto blokadę'
    )
  } catch (error) {
    if (
      isAvailabilityDayConflict(error) &&
      retryCount < 1
    ) {
      isSavingTeamAvailability.value = false
      await removeManagerAvailability(
        employeeId,
        dateKey,
        retryCount + 1
      )
      return
    }

    console.error(
      'Błąd usuwania dyspozycji managera:',
      error
    )

    showSaveResultModal(
      'error',
      isAvailabilityDayConflict(error)
        ? 'Dane tego dnia zmieniły się ponownie. Spróbuj zdjąć blokadę jeszcze raz.'
        : 'Nie udało się usunąć dyspozycji managera',
      2500
    )
  } finally {
    isSavingTeamAvailability.value = false
  }
}

const formatDaysRemaining = (days) => {
  if (days === 1) {
    return '1 dzień'
  }

  if (
    days % 10 >= 2 &&
    days % 10 <= 4 &&
    (days % 100 < 12 || days % 100 > 14)
  ) {
    return `${days} dni`
  }

  return `${days} dni`
}

const visibleAvailabilityPeriods = computed(() => {
  const monthStart = formatDateKey(
    new Date(
      displayedMonth.value.getFullYear(),
      displayedMonth.value.getMonth(),
      1
    )
  )

  const monthEnd = formatDateKey(
    new Date(
      displayedMonth.value.getFullYear(),
      displayedMonth.value.getMonth() + 1,
      0
    )
  )

  const todayKey = getWarsawDateKey(
    new Date(periodsClock.value)
  )

  return periodsStore.periods
    .filter(period => {
      return isPeriodEffectivelyOpen(period)
    })
    .map(period => {
      const closesAtDate =
        getDateFromTimestamp(period.closesAt)

      const closesOnKey = closesAtDate
        ? getWarsawDateKey(closesAtDate)
        : todayKey

      return {
        id: period.id,
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        isCurrentMonth:
          period.dateFrom <= monthEnd &&
          period.dateTo >= monthStart,
        name: period.name || 'Okres bez nazwy',
        modelName: getDemandModelName(
          period.demandModelId
        ),
        dateRange:
          `${formatCompactDateKey(period.dateFrom)}–` +
          `${formatCompactDateKey(period.dateTo)}`,
        closesOn: formatCompactDateKey(closesOnKey),
        daysRemaining: getDaysBetweenDateKeys(
          todayKey,
          closesOnKey
        )
      }
    })
    .sort((periodA, periodB) => {
      const endDateComparison =
        periodB.dateTo.localeCompare(periodA.dateTo)

      if (endDateComparison !== 0) {
        return endDateComparison
      }

      return periodB.dateFrom.localeCompare(
        periodA.dateFrom
      )
    })
})



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

const isPeriodEffectivelyOpen = (period) => {
  return isAvailabilityPeriodEffectivelyOpen(period, {
    nowMs: periodsClock.value,
    todayDateKey
  })
}

const getOpenPeriodForDateKey = (dateKey) => {
  return findAvailabilityPeriodForDate({
    periods: periodsStore.periods,
    dateKey,
    isPeriodAllowed: isPeriodEffectivelyOpen
  })
}

const getPeriodForDateKey = (dateKey) => {
  return findAvailabilityPeriodForDate({
    periods: periodsStore.periods,
    dateKey
  })
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
  const getCalendarPeriod = canManageSchedule.value
    ? getPeriodForDateKey
    : getOpenPeriodForDateKey

  const period = getCalendarPeriod(dateKey)

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
      ? getCalendarPeriod(
          getShiftedDateKey(dateKey, -1)
        )
      : null

  const nextPeriod =
    columnIndex < 6
      ? getCalendarPeriod(
          getShiftedDateKey(dateKey, 1)
        )
      : null

  const startsRange =
    previousPeriod?.id !== period.id

  const endsRange =
    nextPeriod?.id !== period.id

  return {
    'availability-period-open':
      isPeriodEffectivelyOpen(period),
    'availability-period-assigned':
      canManageSchedule.value &&
      !isPeriodEffectivelyOpen(period),
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

  return canEditAvailabilityDate({
    periods: periodsStore.periods,
    dateKey,
    isManager: canManageSchedule.value,
    isEffectivelyOpen: isPeriodEffectivelyOpen
  })
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


const demandDayKeys = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
]

const getDemandDayKey = (dateKey) => {
  if (!dateKey) {
    return null
  }

  const [year, month, day] = dateKey
    .split('-')
    .map(Number)

  const date = new Date(year, month - 1, day)

  return demandDayKeys[date.getDay()] || null
}

const getTimeMinutes = (timeValue) => {
  if (!timeValue) {
    return null
  }

  const [hours, minutes] = timeValue
    .split(':')
    .map(Number)

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null
  }

  return hours * 60 + minutes
}

const getTimeRange = (timeFrom, timeTo) => {
  const start = getTimeMinutes(timeFrom)
  let end = getTimeMinutes(timeTo)

  if (start === null || end === null || start === end) {
    return null
  }

  if (end < start) {
    end += 24 * 60
  }

  return { start, end }
}

const doesAvailabilityCoverDemand = (
  availability,
  demandFrom,
  demandTo
) => {
  const availabilityType = availability?.type || 'full'

  if (availabilityType === 'unavailable') {
    return false
  }

  if (
    availabilityType === 'full' ||
    availabilityType === 'preferred_off'
  ) {
    return true
  }

  if (availabilityType !== 'partial') {
    return true
  }

  const demandRange = getTimeRange(
    demandFrom,
    demandTo
  )

  const availabilityRange = getTimeRange(
    availability.timeFrom,
    availability.timeTo
  )

  if (!demandRange || !availabilityRange) {
    return false
  }

  return (
    availabilityRange.start <= demandRange.start &&
    availabilityRange.end >= demandRange.end
  )
}

const getRequiredPeople = (vacancy) => {
  const requiredPeople = Math.trunc(
    Number(vacancy?.requiredPeople)
  )

  return Number.isFinite(requiredPeople) &&
    requiredPeople >= 1
    ? requiredPeople
    : 1
}

const evaluateDayCoverage = (
  dateKey,
  availabilityByEmployee = teamAvailabilityRecords.value
) => {

  if (!dateKey) {
    return {
      periodName: '',
      modelName: '',
      message: 'Wybierz dzień w kalendarzu.',
      shortageCount: 0,
      groups: []
    }
  }

  const period = getPeriodForDateKey(dateKey)

  if (!period) {
    return {
      periodName: '',
      modelName: '',
      message:
        'Ten dzień nie ma przypisanego okresu i modelu zapotrzebowania.',
      shortageCount: 0,
      groups: []
    }
  }

  if (isDateBlockedInPeriod(period, dateKey)) {
    return {
      periodName: period.name || 'Okres bez nazwy',
      modelName: '',
      message:
        'Ten dzień został wyłączony z okresu dyspozycji.',
      status: 'empty',
      matchedCount: 0,
      hardMatchedCount: 0,
      shortageCount: 0,
      preferredOffUsedCount: 0,
      affectedPositionNames: [],
      groups: []
    }
  }

  if (!period.demandModelId) {
    return {
      periodName: period.name || 'Okres bez nazwy',
      modelName: '',
      message:
        'Do tego okresu nie przypisano modelu zapotrzebowania.',
      shortageCount: 0,
      groups: []
    }
  }

  const demandModel = demandModelsStore.models.find(
    model => model.id === period.demandModelId
  )

  if (!demandModel) {
    return {
      periodName: period.name || 'Okres bez nazwy',
      modelName: '',
      message:
        'Nie znaleziono modelu przypisanego do tego okresu.',
      shortageCount: 0,
      groups: []
    }
  }

  const dayKey = getDemandDayKey(dateKey)
  const vacancies = Array.isArray(
    demandModel.days?.[dayKey]
  )
    ? demandModel.days[dayKey]
    : []

  const slots = []

  vacancies.forEach((vacancy, vacancyIndex) => {
    if (
      !vacancy?.positionId ||
      !vacancy?.from ||
      !vacancy?.to ||
      vacancy.from === vacancy.to
    ) {
      return
    }

    const requiredPeople = getRequiredPeople(vacancy)
    const demandRange = getTimeRange(
      vacancy.from,
      vacancy.to
    )

    for (
      let slotIndex = 0;
      slotIndex < requiredPeople;
      slotIndex += 1
    ) {
      slots.push({
        id:
          `${vacancy.id || `vacancy-${vacancyIndex}`}` +
          `-slot-${slotIndex + 1}`,
        positionId: vacancy.positionId,
        positionName: getSchedulePositionName(
          vacancy.positionId
        ),
        from: vacancy.from,
        to: vacancy.to,
        duration:
          demandRange
            ? demandRange.end - demandRange.start
            : 0
      })
    }
  })

  const getEmployeeCompetencyCount = (employee) => {
    return (employee.positionAssignments || [])
      .filter(assignment => Number(assignment.competencyStars) >= 1)
      .length
  }

  slots.forEach(slot => {
    const candidates = activeEmployees.value
      .filter(
        employee => {
          const competency = getCompetencyStars(employee, slot.positionId)

          if (!Number.isFinite(competency) || competency < 1) {
            return false
          }

          const availability =
            availabilityByEmployee[employee.id] || null

          return doesAvailabilityCoverDemand(
            availability,
            slot.from,
            slot.to
          )
        }
      )
      .map(employee => {
        const availability =
          availabilityByEmployee[employee.id] || null

        return {
          employeeId: employee.id,
          isPreferredOff:
            availability?.type === 'preferred_off',
          competencyCount:
            getEmployeeCompetencyCount(employee),
          sortName:
            `${employee.nazwisko || ''} ` +
            `${employee.imie || ''}`
        }
      }
      )
      .sort((candidateA, candidateB) => {
        if (
          candidateA.isPreferredOff !==
          candidateB.isPreferredOff
        ) {
          return candidateA.isPreferredOff ? 1 : -1
        }

        if (
          candidateA.competencyCount !==
          candidateB.competencyCount
        ) {
          return (
            candidateA.competencyCount -
            candidateB.competencyCount
          )
        }

        return candidateA.sortName.localeCompare(
          candidateB.sortName,
          'pl'
        )
      })

    slot.candidates = candidates
    slot.candidateIds = candidates.map(
      candidate => candidate.employeeId
    )
    slot.hardCandidateIds = candidates
      .filter(candidate => !candidate.isPreferredOff)
      .map(candidate => candidate.employeeId)
  })

  const orderedSlots = [...slots].sort(
    (slotA, slotB) => {
      if (
        slotA.hardCandidateIds.length !==
        slotB.hardCandidateIds.length
      ) {
        return (
          slotA.hardCandidateIds.length -
          slotB.hardCandidateIds.length
        )
      }

      if (
        slotA.candidateIds.length !==
        slotB.candidateIds.length
      ) {
        return (
          slotA.candidateIds.length -
          slotB.candidateIds.length
        )
      }

      if (slotA.duration !== slotB.duration) {
        return slotB.duration - slotA.duration
      }

      if (slotA.from !== slotB.from) {
        return slotA.from.localeCompare(slotB.from)
      }

      return slotA.positionName.localeCompare(
        slotB.positionName,
        'pl'
      )
    }
  )

  const slotById = new Map(
    slots.map(slot => [slot.id, slot])
  )

  const employeeToSlot = new Map()

  const tryAssignSlot = (
    slotId,
    allowPreferredOff,
    visitedEmployeeIds
  ) => {
    const slot = slotById.get(slotId)

    if (!slot) {
      return false
    }

    const candidateIds = allowPreferredOff
      ? slot.candidateIds
      : slot.hardCandidateIds

    for (const employeeId of candidateIds) {
      if (visitedEmployeeIds.has(employeeId)) {
        continue
      }

      visitedEmployeeIds.add(employeeId)

      const previousSlotId =
        employeeToSlot.get(employeeId)

      if (
        !previousSlotId ||
        tryAssignSlot(
          previousSlotId,
          allowPreferredOff,
          visitedEmployeeIds
        )
      ) {
        employeeToSlot.set(employeeId, slotId)
        return true
      }
    }

    return false
  }

  orderedSlots.forEach(slot => {
    tryAssignSlot(slot.id, false, new Set())
  })

  const hardAssignedSlotCount = new Set(
    employeeToSlot.values()
  ).size

  let assignedSlotIds = new Set(
    employeeToSlot.values()
  )

  orderedSlots.forEach(slot => {
    if (assignedSlotIds.has(slot.id)) {
      return
    }

    tryAssignSlot(slot.id, true, new Set())

    assignedSlotIds = new Set(
      employeeToSlot.values()
    )
  })

  const slotToEmployee = new Map()

  employeeToSlot.forEach((slotId, employeeId) => {
    slotToEmployee.set(slotId, employeeId)
  })

  slots.forEach(slot => {
    slot.assignedEmployeeId =
      slotToEmployee.get(slot.id) || null
  })

  const groupsMap = new Map()

  slots.forEach(slot => {
    if (!groupsMap.has(slot.positionId)) {
      groupsMap.set(slot.positionId, {
        positionId: slot.positionId,
        positionName: slot.positionName,
        slots: []
      })
    }

    groupsMap.get(slot.positionId).slots.push(slot)
  })

  const groups = [...groupsMap.values()]
    .map(group => ({
      ...group,
      slots: group.slots.sort((slotA, slotB) => {
        if (slotA.from !== slotB.from) {
          return slotA.from.localeCompare(slotB.from)
        }

        if (slotA.to !== slotB.to) {
          return slotA.to.localeCompare(slotB.to)
        }

        return slotA.id.localeCompare(slotB.id)
      })
    }))
    .sort((groupA, groupB) => {
      return groupA.positionName.localeCompare(
        groupB.positionName,
        'pl'
      )
    })

  const shortageCount = slots.filter(
    slot => !slot.assignedEmployeeId
  ).length

  const matchedCount =
    employeeToSlot.size

  const preferredOffUsedCount =
    [...employeeToSlot.keys()].filter(employeeId => {
      return (
        availabilityByEmployee[employeeId]?.type ===
        'preferred_off'
      )
    }).length

  const affectedSlotIds = new Set(
    slots
      .filter(slot => !slot.assignedEmployeeId)
      .map(slot => slot.id)
  )

  const visitedEmployeeIds = new Set()
  const pendingSlotIds = [...affectedSlotIds]

  while (pendingSlotIds.length > 0) {
    const currentSlotId = pendingSlotIds.shift()
    const currentSlot = slotById.get(currentSlotId)

    if (!currentSlot) {
      continue
    }

    currentSlot.candidateIds.forEach(employeeId => {
      if (visitedEmployeeIds.has(employeeId)) {
        return
      }

      visitedEmployeeIds.add(employeeId)

      const assignedSlotId =
        employeeToSlot.get(employeeId)

      if (
        assignedSlotId &&
        !affectedSlotIds.has(assignedSlotId)
      ) {
        affectedSlotIds.add(assignedSlotId)
        pendingSlotIds.push(assignedSlotId)
      }
    })
  }

  const affectedPositionNames = [
    ...new Set(
      [...affectedSlotIds]
        .map(slotId => slotById.get(slotId)?.positionName)
        .filter(Boolean)
    )
  ].sort((nameA, nameB) =>
    nameA.localeCompare(nameB, 'pl')
  )

  const status = slots.length === 0
    ? 'empty'
    : shortageCount > 0
      ? 'shortage'
      : preferredOffUsedCount > 0
        ? 'preferred'
        : 'complete'

  return {
    periodName: period.name || 'Okres bez nazwy',
    modelName: demandModel.name || 'Model bez nazwy',
    message:
      slots.length === 0
        ? 'Model nie przewiduje zapotrzebowania na ten dzień.'
        : '',
    status,
    matchedCount,
    hardMatchedCount: hardAssignedSlotCount,
    shortageCount,
    preferredOffUsedCount,
    affectedPositionNames,
    groups
  }
}

const selectedDayDemandControl = computed(() => {
  return evaluateDayCoverage(
    selectedDateKey.value,
    teamAvailabilityRecords.value
  )
})

const AVAILABILITY_DAY_CHANGED_ERROR =
  'availability-day-version-changed'

const getAvailabilityDayVersionRef = (
  restaurantId,
  dateKey
) => {
  return doc(
    db,
    'users',
    restaurantId,
    'grafik_dyspozycyjnosc_wersje',
    dateKey
  )
}

const fetchAvailabilityDayVersions = async (
  restaurantId,
  dateKeys
) => {
  const uniqueDateKeys = [...new Set(dateKeys)]

  const snapshots = await Promise.all(
    uniqueDateKeys.map(dateKey => {
      return getDoc(
        getAvailabilityDayVersionRef(
          restaurantId,
          dateKey
        )
      )
    })
  )

  return uniqueDateKeys.reduce(
    (versions, dateKey, index) => {
      const snapshot = snapshots[index]

      versions[dateKey] = snapshot.exists()
        ? Number(snapshot.data()?.version || 0)
        : 0

      return versions
    },
    {}
  )
}

const commitAvailabilityMutations = async ({
  restaurantId,
  dateKeys,
  expectedVersions,
  mutations
}) => {
  const uniqueDateKeys = [...new Set(dateKeys)]

  if (uniqueDateKeys.length === 0) {
    return
  }

  await runTransaction(db, async transaction => {
    const versionRefs = uniqueDateKeys.map(
      dateKey => {
        return getAvailabilityDayVersionRef(
          restaurantId,
          dateKey
        )
      }
    )

    const versionSnapshots = await Promise.all(
      versionRefs.map(versionRef => {
        return transaction.get(versionRef)
      })
    )

    uniqueDateKeys.forEach((dateKey, index) => {
      const snapshot = versionSnapshots[index]

      const currentVersion = snapshot.exists()
        ? Number(snapshot.data()?.version || 0)
        : 0

      if (
        currentVersion !==
        Number(expectedVersions[dateKey] || 0)
      ) {
        const conflictError = new Error(
          AVAILABILITY_DAY_CHANGED_ERROR
        )

        conflictError.code =
          AVAILABILITY_DAY_CHANGED_ERROR

        throw conflictError
      }
    })

    mutations.forEach(mutation => {
      if (mutation.type === 'delete') {
        transaction.delete(mutation.ref)
        return
      }

      transaction.set(
        mutation.ref,
        mutation.data
      )
    })

    uniqueDateKeys.forEach((dateKey, index) => {
      const currentVersion =
        Number(expectedVersions[dateKey] || 0)

      transaction.set(versionRefs[index], {
        date: dateKey,
        version: currentVersion + 1,
        updatedAt: serverTimestamp()
      })
    })
  })
}

const isAvailabilityDayConflict = error => {
  return (
    error?.code === AVAILABILITY_DAY_CHANGED_ERROR ||
    error?.message === AVAILABILITY_DAY_CHANGED_ERROR
  )
}

const calendarDayCoverageByDate = computed(() => {
  if (
    !canManageSchedule.value ||
    selectedViewMode.value !== 'all'
  ) {
    return {}
  }

  return calendarDays.value.reduce((statuses, day) => {
    if (!day) {
      return statuses
    }

    const dateKey = formatDateKey(day)
    const period = getPeriodForDateKey(dateKey)

    if (
      !period ||
      isDateBlockedInPeriod(period, dateKey)
    ) {
      return statuses
    }

    statuses[dateKey] = evaluateDayCoverage(
      dateKey,
      monthAvailabilityRecords.value[dateKey] || {}
    ).status || 'empty'

    return statuses
  }, {})
})

const getCalendarDayCoverageStatus = (day) => {
  if (!day) {
    return 'empty'
  }

  return (
    calendarDayCoverageByDate.value[
      formatDateKey(day)
    ] || 'empty'
  )
}


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
      getCompetencyStars(employee, selectedPositionFilter.value)
    )
  })

  return employees.sort((employeeA, employeeB) => {
    const starsA = getCompetencyStars(employeeA, selectedPositionFilter.value)

    const starsB = getCompetencyStars(employeeB, selectedPositionFilter.value)

    return starsB - starsA
  })
})






</script>
